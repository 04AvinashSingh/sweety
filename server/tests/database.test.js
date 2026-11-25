const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createEmbeddedDatabase } = require("../src/config/db");

test("local database persists committed data across restarts", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "sweety-db-test-"));
  let db = createEmbeddedDatabase(directory);
  try {
    await db.query("CREATE TABLE persistence_test (value INTEGER)");
    await db.query("INSERT INTO persistence_test VALUES($1)", [115]);
    await db.pool.end();
    db = createEmbeddedDatabase(directory);
    expect((await db.query("SELECT value FROM persistence_test")).rows).toEqual(
      [{ value: 115 }],
    );
  } finally {
    await db.pool.end();
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("standalone queries wait until an embedded transaction releases its connection", async () => {
  const db = createEmbeddedDatabase();
  try {
    await db.query("CREATE TABLE transaction_test (value INTEGER)");
    const transaction = await db.pool.connect();
    await transaction.query("BEGIN");
    await transaction.query("INSERT INTO transaction_test VALUES($1)", [111]);
    let completed = false;
    const outside = db
      .query("SELECT * FROM transaction_test")
      .then((result) => {
        completed = true;
        return result;
      });
    await new Promise((resolve) => setImmediate(resolve));
    expect(completed).toBe(false);
    await transaction.query("ROLLBACK");
    transaction.release();
    expect((await outside).rows).toEqual([]);
  } finally {
    await db.pool.end();
  }
});

test("concurrent HTTP writes through the local adapter enforce a single daily slot", async () => {
  const { createApp } = require("../src/app");
  const request =
  process.env.TEST_TRANSPORT === "in-process"
    ? require("./helpers/inProcessRequest")
    : require("supertest");
  const { today } = require("../src/services/reportService");
  const db = createEmbeddedDatabase();
  try {
    await db.query(
      require("node:fs").readFileSync(
        path.join(__dirname, "../src/db/schema.sql"),
        "utf8",
      ),
    );
    const app = createApp(
      db,
      "embedded-adapter-test-secret-with-32-characters",
    );
    const registration = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Adapter Test",
        email: "adapter@sweety.test",
        password: "TestPassword123!",
      });
    const token = registration.body.token;
    const input = {
      reading_date: today(),
      slot: "Morning (fasting)",
      value: 115,
    };
    const responses = await Promise.all(
      [1, 2].map(() =>
        request(app)
          .post("/api/readings")
          .set("Authorization", "Bearer " + token)
          .send(input),
      ),
    );
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 400,
    ]);
    const reading = responses.find((response) => response.status === 201).body;
    const deletion = await request(app)
      .delete("/api/readings/" + reading.id)
      .set("Authorization", "Bearer " + token);
    expect(deletion.status).toBe(200);
    expect(
      (await db.query("SELECT COUNT(*)::int AS count FROM readings")).rows[0]
        .count,
    ).toBe(0);
  } finally {
    await db.pool.end();
  }
});

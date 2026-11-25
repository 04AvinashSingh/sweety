const { PGlite } = require("@electric-sql/pglite");
const fs = require("fs");
const request =
  process.env.TEST_TRANSPORT === "in-process"
    ? require("./helpers/inProcessRequest")
    : require("supertest");
const { createApp } = require("../src/app");
const { slots, today, range } = require("../src/services/reportService");
let pool, app, token, other;
const date = today();
const body = (slot = slots[0], value = 110) => ({
  reading_date: date,
  slot,
  value,
});
const call = (method, path, data, auth = token) =>
  request(app)[method](path).set("Authorization", `Bearer ${auth}`).send(data);
beforeAll(async () => {
  const database = new PGlite();
  await database.exec(
    fs.readFileSync(__dirname + "/../src/db/schema.sql", "utf8"),
  );
  pool = {
    async query(sql, params) {
      const result = await database.query(sql, params);
      return { ...result, rowCount: result.affectedRows ?? result.rows.length };
    },
    async connect() {
      return { query: this.query, release() {} };
    },
    end() {
      return database.close();
    },
  };
  app = createApp(
    { pool, query: (sql, params) => pool.query(sql, params) },
    "test-secret-that-has-at-least-32-characters",
  );
  token = (
    await request(app).post("/api/auth/register").send({
      name: "Test Patient",
      email: "test@example.com",
      password: "Password123!",
    })
  ).body.token;
  other = (
    await request(app).post("/api/auth/register").send({
      name: "Other Patient",
      email: "other@example.com",
      password: "Password123!",
    })
  ).body.token;
});
afterAll(() => pool?.end());
beforeEach(() => pool.query("DELETE FROM readings"));
test("register, login, current user and authorization", async () => {
  expect(token).toBeTruthy();
  expect(
    (
      await request(app)
        .post("/api/auth/login")
        .send({ email: "test@example.com", password: "Password123!" })
    ).status,
  ).toBe(200);
  expect(
    (
      await request(app)
        .post("/api/auth/login")
        .send({ email: "test@example.com", password: "wrong" })
    ).status,
  ).toBe(401);
  expect((await call("get", "/api/auth/me")).body.user.email).toBe(
    "test@example.com",
  );
  expect((await request(app).get("/api/readings")).status).toBe(401);
  expect(
    (
      await request(app).post("/api/auth/register").send({
        name: "Duplicate",
        email: "test@example.com",
        password: "Password123!",
      })
    ).status,
  ).toBe(409);
});
test.each([
  [null, "Please enter a glucose value."],
  ["", "Please enter a glucose value."],
  [700, "Value must be between 40 and 600 mg/dl."],
  [39, "Value must be between 40 and 600 mg/dl."],
  [100.5, "Value must be between 40 and 600 mg/dl."],
])("validates value %p", async (value, message) => {
  const response = await call("post", "/api/readings", body(slots[0], value));
  expect(response.status).toBe(400);
  expect(response.body.message).toBe(message);
});
test("rejects duplicate slots, a fifth reading, invalid dates and future dates", async () => {
  expect((await call("post", "/api/readings", body())).status).toBe(201);
  expect((await call("post", "/api/readings", body())).body.message).toBe(
    `You already have an ${slots[0]} reading for this date.`,
  );
  for (const slot of slots.slice(1))
    expect((await call("post", "/api/readings", body(slot))).status).toBe(201);
  expect((await call("post", "/api/readings", body())).body.message).toBe(
    "You can add only 4 readings per day.",
  );
  expect(
    (
      await call("post", "/api/readings", {
        ...body(),
        reading_date: "2099-01-01",
      })
    ).body.message,
  ).toBe("Date cannot be in the future.");
  expect(
    (
      await call("post", "/api/readings", {
        ...body(),
        reading_date: "2026-02-30",
      })
    ).status,
  ).toBe(400);
});
test("CRUD, partial updates, collisions, pagination and ownership", async () => {
  const reading = (await call("post", "/api/readings", body())).body;
  await call("post", "/api/readings", body(slots[1], 150));
  expect(
    (await call("get", "/api/readings", undefined, other)).body.pagination
      .total,
  ).toBe(0);
  expect(
    (await call("put", `/api/readings/${reading.id}`, { value: 120 }, other))
      .status,
  ).toBe(404);
  const update = await call("put", `/api/readings/${reading.id}`, {
    value: 120,
  });
  expect(update.status).toBe(200);
  expect(update.body.value).toBe(120);
  expect(
    (await call("put", `/api/readings/${reading.id}`, { slot: slots[1] }))
      .status,
  ).toBe(400);
  const listing = await call("get", "/api/readings?page=1&limit=1");
  expect(listing.body.data).toHaveLength(1);
  expect(listing.body.pagination.totalPages).toBe(2);
  expect((await call("get", "/api/readings?limit=-1")).status).toBe(400);
  expect(
    (await call("delete", `/api/readings/${reading.id}`, undefined, other))
      .status,
  ).toBe(404);
  expect((await call("delete", `/api/readings/${reading.id}`)).status).toBe(
    200,
  );
});
test("report aggregates, empty state and calendar ranges", async () => {
  expect(range("monthly", "2026-01-15")).toEqual(["2025-12-01", "2025-12-31"]);
  expect(range("monthly", "2024-03-15")).toEqual(["2024-02-01", "2024-02-29"]);
  expect(range("month-to-date", "2026-10-15")).toEqual([
    "2026-10-01",
    "2026-10-15",
  ]);
  const empty = (await call("get", `/api/reports/daily?date=${date}`)).body;
  expect(empty).toMatchObject({
    count: 0,
    highest: null,
    lowest: null,
    average: null,
    readings: [],
  });
  await call("post", "/api/readings", body(slots[0], 101));
  await call("post", "/api/readings", body(slots[1], 150));
  const report = (await call("get", `/api/reports/daily?date=${date}`)).body;
  expect(report).toMatchObject({
    count: 2,
    highest: 150,
    lowest: 101,
    average: 125.5,
  });
  expect(
    (await call("get", `/api/reports/month-to-date?date=${date}`)).body.count,
  ).toBe(2);
  const previous = range("monthly", date)[0];
  await call("post", "/api/readings", {
    ...body(),
    reading_date: previous,
    value: 99,
  });
  expect(
    (await call("get", `/api/reports/monthly?date=${date}`)).body,
  ).toMatchObject({ count: 1, average: 99 });
  expect(
    (await call("get", `/api/reports/daily?date=${date}`, undefined, other))
      .body.count,
  ).toBe(0);
});

test("rejects malformed bodies, invalid IDs and explicitly cleared dates", async () => {
  expect(
    (
      await request(app)
        .post("/api/readings")
        .set("Authorization", `Bearer ${token}`)
        .send([])
    ).status,
  ).toBe(400);
  expect((await call("delete", "/api/readings/invalid")).status).toBe(400);
  const reading = (await call("post", "/api/readings", body())).body;
  expect(
    (await call("put", `/api/readings/${reading.id}`, { reading_date: "" }))
      .status,
  ).toBe(400);
  expect(
    (await call("put", `/api/readings/${reading.id}`, { reading_date: null }))
      .status,
  ).toBe(400);
  expect(
    (await call("get", `/api/reports/daily?date=${date}`)).body.count,
  ).toBe(1);
});

test("moving a reading respects the destination slot and preserves the source on failure", async () => {
  const previous = range("monthly", date)[0];
  const reading = (await call("post", "/api/readings", body())).body;
  await call("post", "/api/readings", { ...body(), reading_date: previous });
  expect(
    (
      await call("put", `/api/readings/${reading.id}`, {
        reading_date: previous,
      })
    ).status,
  ).toBe(400);
  expect(
    (await call("get", `/api/reports/daily?date=${date}`)).body.count,
  ).toBe(1);
  expect(
    (
      await call("put", `/api/readings/${reading.id}`, {
        reading_date: previous,
        slot: slots[1],
      })
    ).status,
  ).toBe(200);
  expect(
    (await call("get", `/api/reports/daily?date=${date}`)).body.count,
  ).toBe(0);
  expect(
    (await call("get", `/api/reports/daily?date=${previous}`)).body.count,
  ).toBe(2);
});

const { PGlite } = require("@electric-sql/pglite");
const bcrypt = require("bcryptjs");
const { seed } = require("../src/db/seed");
const { range, today } = require("../src/services/reportService");

test("demo seed is idempotent and stays within the current and previous month", async () => {
  const database = new PGlite();
  const adapter = {
    query: (sql, params) =>
      params ? database.query(sql, params) : database.exec(sql),
    pool: {
      async connect() {
        return { query: adapter.query, release() {} };
      },
    },
  };
  try {
    await seed(adapter);
    const first = (
      await database.query("SELECT COUNT(*)::int AS count FROM readings")
    ).rows[0].count;
    expect(first).toBeGreaterThanOrEqual(30);
    await seed(adapter);
    expect(
      (await database.query("SELECT COUNT(*)::int AS count FROM readings"))
        .rows[0].count,
    ).toBe(first);
    const user = (
      await database.query("SELECT * FROM users WHERE email='demo@sweety.app'")
    ).rows[0];
    expect(await bcrypt.compare("Password123!", user.password_hash)).toBe(true);
    const outside = await database.query(
      "SELECT COUNT(*)::int AS count FROM readings WHERE reading_date < $1 OR reading_date > $2",
      [range("monthly", today())[0], today()],
    );
    expect(outside.rows[0].count).toBe(0);
  } finally {
    await database.close();
  }
});

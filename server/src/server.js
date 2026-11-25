require("./config/env");
const fs = require("node:fs");
const path = require("node:path");
const { createApp } = require("./app");
const db = require("./config/db");

async function start() {
  const app = createApp(db);
  await db.query("SELECT 1");
  await db.query(
    fs.readFileSync(path.join(__dirname, "db/schema.sql"), "utf8"),
  );
  if (process.env.SEED_DEMO === "true") {
    const { seed } = require("./db/seed");
    await seed(db);
  }
  const server = app.listen(process.env.PORT || 3001, () => {
    console.log(
      `Sweety API ready at http://localhost:${process.env.PORT || 3001} (${process.env.DB_DRIVER || "postgres"})`,
    );
  });
  server.on("error", async (error) => {
    console.error(`Server startup failed: ${error.message}`);
    await db.pool.end();
    process.exitCode = 1;
  });
  const shutdown = () => server.close(() => db.pool.end());
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

start().catch(async (error) => {
  console.error(
    `Database startup failed (${error.code || "configuration"}): ${error.message || "Unable to connect. Check DATABASE_URL and start PostgreSQL, or set DB_DRIVER=pglite for local development."}`,
  );
  await db.pool.end();
  process.exitCode = 1;
});

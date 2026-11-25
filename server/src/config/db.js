require("./env");
const fs = require("node:fs");
const path = require("node:path");
const { Pool, types } = require("pg");
types.setTypeParser(1082, (value) => value);

function createEmbeddedDatabase(directory) {
  const { PGlite } = require("@electric-sql/pglite");
  const database = new PGlite(directory);
  let queue = Promise.resolve();

  // A transaction holds the sole embedded connection until release. Standalone
  // queries join the same queue so concurrent requests cannot share a transaction.
  async function connect() {
    const previous = queue;
    let unlock;
    queue = new Promise((resolve) => {
      unlock = resolve;
    });
    await previous;
    let released = false;
    return {
      async query(sql, params) {
        if (released) throw new Error("Database connection has been released.");
        const result =
          params === undefined
            ? (await database.exec(sql)).at(-1)
            : await database.query(sql, params);
        return {
          ...result,
          rowCount: result.affectedRows ?? result.rows.length,
        };
      },
      release() {
        if (!released) {
          released = true;
          unlock();
        }
      },
    };
  }

  const pool = {
    connect,
    async query(sql, params) {
      const connection = await connect();
      try {
        return await connection.query(sql, params);
      } finally {
        connection.release();
      }
    },
    async end() {
      await queue;
      await database.close();
    },
  };
  return { pool, query: (sql, params) => pool.query(sql, params) };
}

function createDatabase() {
  if (process.env.DB_DRIVER === "pglite") {
    const directory = path.resolve(
      __dirname,
      "../../",
      process.env.PGLITE_DATA_DIR || ".data/sweety",
    );
    fs.mkdirSync(directory, { recursive: true });
    return createEmbeddedDatabase(directory);
  }
  if (process.env.DB_DRIVER && process.env.DB_DRIVER !== "postgres") {
    throw new Error("DB_DRIVER must be postgres or pglite.");
  }
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : false,
  });
  return { pool, query: (sql, params) => pool.query(sql, params) };
}

let database;
function getDatabase() {
  if (!database) database = createDatabase();
  return database;
}
module.exports = {
  createEmbeddedDatabase,
  query: (sql, params) => getDatabase().query(sql, params),
  pool: {
    connect: () => getDatabase().pool.connect(),
    query: (sql, params) => getDatabase().query(sql, params),
    end: () => (database ? database.pool.end() : Promise.resolve()),
  },
};

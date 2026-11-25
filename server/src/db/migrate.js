const fs = require("fs");
const db = require("../config/db");
db.query(fs.readFileSync(__dirname + "/schema.sql", "utf8"))
  .then(() => console.log("Migration complete"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.pool.end());

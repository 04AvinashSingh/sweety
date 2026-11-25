const fs = require("fs");
const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { slots, today, range } = require("../services/reportService");
async function seed(database = db) {
  await database.query(fs.readFileSync(__dirname + "/schema.sql", "utf8"));
  const connection = await database.pool.connect();
  try {
    await connection.query("BEGIN");
    const hash = await bcrypt.hash("Password123!", 10);
    const user = (
      await connection.query(
        "INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) ON CONFLICT(email) DO UPDATE SET password_hash=$3 RETURNING id",
        ["Demo Patient", "demo@sweety.app", hash],
      )
    ).rows[0];
    const reference = today();
    for (let offset = 0; offset < 45; offset++) {
      const date = new Date(reference + "T12:00:00Z");
      date.setUTCDate(date.getUTCDate() - offset);
      if (date.toISOString().slice(0, 10) < range("monthly", reference)[0])
        break;
      for (let index = 0; index < slots.length; index++) {
        await connection.query(
          "INSERT INTO readings(user_id,reading_date,slot,value) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,reading_date,slot) DO NOTHING",
          [
            user.id,
            date.toISOString().slice(0, 10),
            slots[index],
            89 + ((offset * 7 + index * 19) % 83),
          ],
        );
      }
    }
    await connection.query("COMMIT");
    console.log("Demo ready: demo@sweety.app / Password123!");
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
}
module.exports = { seed };
if (require.main === module) {
  seed()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => db.pool.end());
}

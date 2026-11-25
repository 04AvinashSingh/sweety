require("dotenv").config({ quiet: true });
module.exports = {
  port: process.env.PORT || 3001,
  timezone: process.env.APP_TIMEZONE || "Asia/Kolkata",
};

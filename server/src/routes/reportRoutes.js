const express = require("express");
const { normalizeReading } = require("../controllers/readingController");
const {
  slots,
  today,
  validDate,
  range,
  summarize,
} = require("../services/reportService");

function createReportRouter(db) {
  const router = express.Router();

  router.get("/:type", async (req, res) => {
    const date = req.query.date || today();
    if (
      !validDate(date) ||
      date > today() ||
      !["daily", "month-to-date", "monthly"].includes(req.params.type)
    ) {
      return res
        .status(400)
        .json({ message: "Please provide a valid report period and date." });
    }

    const [start, end] = range(req.params.type, date);
    const result = await db.query(
      "SELECT * FROM readings WHERE user_id=$1 AND reading_date >= $2 AND reading_date <= $3 ORDER BY reading_date, created_at",
      [req.user.id, start, end],
    );

    const rows = result.rows
      .map(normalizeReading)
      .sort(
        (a, b) =>
          String(a.reading_date).localeCompare(String(b.reading_date)) ||
          slots.indexOf(a.slot) - slots.indexOf(b.slot),
      );

    res.json({ start, end, ...summarize(rows) });
  });

  return router;
}

module.exports = { createReportRouter };

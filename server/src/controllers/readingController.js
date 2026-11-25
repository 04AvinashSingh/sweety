const { slots, validDate, today } = require("../services/reportService");

function normalizeReading(row) {
  return {
    ...row,
    reading_date:
      row.reading_date instanceof Date
        ? row.reading_date.toISOString().slice(0, 10)
        : row.reading_date,
  };
}

function validateReadingInput({ value, slot, reading_date }) {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === "" ||
    Number.isNaN(Number(value))
  ) {
    return "Please enter a glucose value.";
  }
  if (
    !["number", "string"].includes(typeof value) ||
    !Number.isInteger(Number(value)) ||
    Number(value) < 40 ||
    Number(value) > 600
  ) {
    return "Value must be between 40 and 600 mg/dl.";
  }
  if (!slots.includes(slot)) {
    return "Please select a valid time slot.";
  }
  if (!validDate(reading_date)) {
    return "Please provide a valid date.";
  }
  if (reading_date > today()) {
    return "Date cannot be in the future.";
  }
  return null;
}

function createReadingController(db) {
  async function list(req, res) {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      (req.query.date && !validDate(req.query.date))
    ) {
      return res.status(400).json({ message: "Invalid date or pagination." });
    }

    const params = [req.user.id];
    let filter = "user_id=$1";
    if (req.query.date) {
      params.push(req.query.date);
      filter += " AND reading_date=$2";
    }

    const total = Number(
      (
        await db.query(
          "SELECT COUNT(*) AS total FROM readings WHERE " + filter,
          params,
        )
      ).rows[0].total,
    );

    const result = await db.query(
      "SELECT * FROM readings WHERE " +
        filter +
        " ORDER BY reading_date DESC, CASE slot WHEN 'Morning (fasting)' THEN 0 WHEN 'After breakfast' THEN 1 WHEN 'After lunch' THEN 2 ELSE 3 END LIMIT $" +
        (params.length + 1) +
        " OFFSET $" +
        (params.length + 2),
      [...params, limit, (page - 1) * limit],
    );

    res.json({
      data: result.rows.map(normalizeReading),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  }

  async function save(req, res) {
    const connection = await db.pool.connect();
    try {
      await connection.query("BEGIN");
      // Serialize concurrent mutations for the same user before checking daily limits.
      await connection.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
        req.user.id,
      ]);

      let previous;
      if (req.params.id) {
        previous = (
          await connection.query(
            "SELECT * FROM readings WHERE id=$1 AND user_id=$2",
            [req.params.id, req.user.id],
          )
        ).rows[0];
        if (!previous) {
          await connection.query("ROLLBACK");
          return res.status(404).json({ message: "Reading not found." });
        }
        previous = normalizeReading(previous);
      }

      const input = { ...previous, ...req.body };
      input.reading_date = Object.hasOwn(req.body, "reading_date")
        ? req.body.reading_date
        : Object.hasOwn(req.body, "date")
          ? req.body.date
          : previous?.reading_date;

      const error = validateReadingInput(input);
      if (error) {
        await connection.query("ROLLBACK");
        return res.status(400).json({ message: error });
      }

      const existing = (
        await connection.query(
          "SELECT * FROM readings WHERE user_id=$1 AND reading_date=$2",
          [req.user.id, input.reading_date],
        )
      ).rows.filter((row) => row.id !== previous?.id);

      const conflict =
        existing.length >= 4
          ? "You can add only 4 readings per day."
          : existing.some((row) => row.slot === input.slot)
            ? `You already have an ${input.slot} reading for this date.`
            : null;
      if (conflict) {
        await connection.query("ROLLBACK");
        return res.status(400).json({ message: conflict });
      }

      const params = [
        input.reading_date,
        input.slot,
        Number(input.value),
        req.user.id,
      ];
      const result = previous
        ? await connection.query(
            "UPDATE readings SET reading_date=$1, slot=$2, value=$3, updated_at=CURRENT_TIMESTAMP WHERE user_id=$4 AND id=$5 RETURNING *",
            [...params, previous.id],
          )
        : await connection.query(
            "INSERT INTO readings(reading_date, slot, value, user_id) VALUES($1, $2, $3, $4) RETURNING *",
            params,
          );

      await connection.query("COMMIT");
      res.status(previous ? 200 : 201).json(normalizeReading(result.rows[0]));
    } catch (error) {
      await connection.query("ROLLBACK");
      throw error;
    } finally {
      connection.release();
    }
  }

  async function remove(req, res) {
    const result = await db.query(
      "DELETE FROM readings WHERE id=$1 AND user_id=$2 RETURNING id",
      [req.params.id, req.user.id],
    );
    res.status(result.rowCount ? 200 : 404).json({
      message: result.rowCount
        ? "Reading deleted successfully."
        : "Reading not found.",
    });
  }

  return { list, save, remove };
}

module.exports = {
  normalizeReading,
  validateReadingInput,
  createReadingController,
};

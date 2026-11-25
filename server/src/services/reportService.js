const slots = [
  "Morning (fasting)",
  "After breakfast",
  "After lunch",
  "After dinner",
];
function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: require("../config/env").timezone,
  }).format(new Date());
}
function validDate(value) {
  return (
    typeof value === "string" &&
    !value.startsWith("0000-") &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
function range(type, date) {
  if (type === "daily") return [date, date];
  if (type === "month-to-date") return [date.slice(0, 7) + "-01", date];
  const end = new Date(date.slice(0, 7) + "-01T00:00:00Z");
  end.setUTCDate(0);
  return [
    end.toISOString().slice(0, 7) + "-01",
    end.toISOString().slice(0, 10),
  ];
}
function summarize(readings) {
  if (!readings.length) {
    return { count: 0, highest: null, lowest: null, average: null, readings };
  }
  let highest = readings[0].value;
  let lowest = readings[0].value;
  let total = 0;
  for (const reading of readings) {
    highest = Math.max(highest, reading.value);
    lowest = Math.min(lowest, reading.value);
    total += reading.value;
  }
  return {
    count: readings.length,
    highest,
    lowest,
    average: Math.round((total / readings.length) * 10) / 10,
    readings,
  };
}
module.exports = { slots, today, validDate, range, summarize };

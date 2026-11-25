import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatShortDate } from "../utils/dateUtils";
import { shortSlot } from "../utils/glucoseHelpers";

export default function TrendChart({ readings, singleDay = false }) {
  const data = readings.map((row) => ({
    ...row,
    label: singleDay
      ? shortSlot(row.slot)
      : `${formatShortDate(row.reading_date)} · ${row.slot}`,
    axisLabel: singleDay
      ? shortSlot(row.slot)
      : formatShortDate(row.reading_date),
  }));

  return (
    <div className="chart" aria-label="Glucose trend chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 12, right: 16, left: 0, bottom: 8 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="#e4eae3"
            strokeDasharray="4 4"
          />
          <XAxis
            dataKey="label"
            tickFormatter={(label) => label.split(" · ")[0]}
            tick={{ fontSize: 12, fill: "#5f6c63" }}
            axisLine={false}
            tickLine={false}
            minTickGap={singleDay ? 12 : 40}
          />
          <YAxis
            width={40}
            domain={["auto", "auto"]}
            tick={{ fontSize: 12, fill: "#5f6c63" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: "1px solid #d5e0d7",
              fontSize: 13,
            }}
            formatter={(value) => [`${value} mg/dl`, "Glucose"]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2b745e"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#fff", strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

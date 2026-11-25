import { Activity, ArrowDownLeft, ArrowUpRight, Check } from "lucide-react";

export default function StatSummary({ report, dailyLimit = false }) {
  const cards = [
    {
      label: "Average",
      value: report?.average != null ? report.average.toFixed(1) : null,
      unit: "mg/dl",
      Icon: Activity,
      color: "green",
    },
    {
      label: "Highest",
      value: report?.highest ?? null,
      unit: "mg/dl",
      Icon: ArrowUpRight,
      color: "amber",
    },
    {
      label: "Lowest",
      value: report?.lowest ?? null,
      unit: "mg/dl",
      Icon: ArrowDownLeft,
      color: "blue",
    },
    {
      label: "Readings",
      value: report?.count ?? null,
      unit: dailyLimit ? "/ 4" : "logged",
      Icon: Check,
      color: "purple",
    },
  ];

  return (
    <section className="stats-grid" aria-label="Glucose summary">
      {cards.map(({ label, value, unit, Icon, color }) => (
        <article className="stat-card" key={label}>
          <div className="stat-card-header">
            <span>{label}</span>
            <span className={`stat-icon ${color}`}>
              <Icon size={18} />
            </span>
          </div>
          <div className="stat-value">
            {value ?? "—"}
            <small>{unit}</small>
          </div>
        </article>
      ))}
    </section>
  );
}

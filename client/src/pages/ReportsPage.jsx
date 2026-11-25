import { lazy, Suspense } from "react";
import { CalendarDays, Droplet, Plus } from "lucide-react";
import StatSummary from "../components/StatSummary";
import ReadingsTable from "../components/ReadingsTable";
import { formatDateRange } from "../utils/dateUtils";

const TrendChart = lazy(() => import("../components/TrendChart"));

const periods = [
  { key: "daily", label: "Daily" },
  { key: "month-to-date", label: "Month-to-date" },
  { key: "monthly", label: "Monthly (prev. month)" },
];

export default function ReportsPage({
  period,
  report,
  onChangePeriod,
  onOpenModal,
  onDelete,
}) {
  const readings = report?.readings || [];

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Report period">
        {periods.map(({ key, label }) => (
          <button
            type="button"
            role="tab"
            aria-selected={key === period}
            key={key}
            className={key === period ? "selected" : ""}
            onClick={() => onChangePeriod(key)}
          >
            {label}
          </button>
        ))}
        {report && (
          <span className="range-pill">
            <CalendarDays size={14} />
            {formatDateRange(report.start, report.end)}
          </span>
        )}
      </div>

      <StatSummary report={report} />

      {report?.count === 0 ? (
        <section className="panel">
          <div className="empty">
            <Droplet size={28} />
            <h3>No readings in this period</h3>
            <p>
              No blood glucose readings were logged between{" "}
              {formatDateRange(report.start, report.end)}.
            </p>
            <button
              type="button"
              className="secondary"
              onClick={() => onOpenModal({})}
            >
              <Plus size={16} /> Add reading
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="panel trend-panel">
            <div className="panel-heading">
              <div>
                <h2>Glucose trend</h2>
                <p className="muted">
                  {period === "daily"
                    ? "Readings across slots on the selected date"
                    : "Readings over the selected period"}
                </p>
              </div>
              <span className="chart-key">
                <span className="status-dot" /> Glucose (mg/dl)
              </span>
            </div>
            <Suspense fallback={<div className="loading">Loading chart…</div>}>
              <TrendChart
                readings={readings}
                singleDay={period === "daily"}
              />
            </Suspense>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>
                {period === "daily"
                  ? "Daily readings by slot"
                  : "Readings in this period"}
              </h2>
              <span className="muted panel-meta">
                {readings.length} {readings.length === 1 ? "reading" : "readings"}
              </span>
            </div>
            <ReadingsTable
              rows={readings}
              showDate={period !== "daily"}
              onAdd={() => onOpenModal({})}
              onEdit={(row) => onOpenModal({ reading: row })}
              onDelete={onDelete}
            />
          </section>
        </>
      )}
    </>
  );
}

import { lazy, Suspense } from "react";
import {
  Check,
  ChevronRight,
  Moon,
  Plus,
  Sun,
  Sunrise,
  Sunset,
} from "lucide-react";
import StatSummary from "../components/StatSummary";
import ReadingsTable from "../components/ReadingsTable";
import { today } from "../utils/dateUtils";
import { slots } from "../utils/glucoseHelpers";

const TrendChart = lazy(() => import("../components/TrendChart"));
const slotIcons = [Sunrise, Sun, Sunset, Moon];

export default function OverviewPage({
  date,
  report,
  trend,
  onOpenModal,
  onDelete,
  onViewHistory,
}) {
  const readings = report?.readings || [];

  return (
    <>
      <StatSummary report={report} dailyLimit />

      <section className="panel slots-panel">
        <div className="panel-heading">
          <h2>Daily time slots</h2>
          <span className="muted panel-meta">
            {readings.length} of 4 logged
          </span>
        </div>
        <div className="slots-grid">
          {slots.map((slot, index) => {
            const row = readings.find((item) => item.slot === slot);
            const Icon = slotIcons[index];
            return (
              <button
                type="button"
                key={slot}
                className={`slot-card ${row ? "logged" : ""}`}
                onClick={() =>
                  onOpenModal(row ? { reading: row } : { initialSlot: slot })
                }
              >
                <span className="slot-card-top">
                  <Icon size={20} />
                  {row ? (
                    <span className="check-circle">
                      <Check size={13} />
                    </span>
                  ) : (
                    <Plus size={16} />
                  )}
                </span>
                <strong>{slot}</strong>
                <span className="slot-card-value">
                  {row ? (
                    <>
                      <b>{row.value}</b> mg/dl
                    </>
                  ) : (
                    "Add reading"
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {trend?.count > 0 && (
        <section className="panel trend-panel">
          <div className="panel-heading">
            <div>
              <h2>Month-to-date trend</h2>
              <p className="muted">Readings logged so far this month</p>
            </div>
            <span className="chart-key">
              <span className="status-dot" /> Glucose (mg/dl)
            </span>
          </div>
          <Suspense fallback={<div className="loading">Loading chart…</div>}>
            <TrendChart readings={trend.readings} />
          </Suspense>
        </section>
      )}

      <section className="panel">
        <div className="panel-heading">
          <h2>
            {date === today() ? "Today's readings" : "Readings for selected date"}
          </h2>
          <button
            type="button"
            className="text-button"
            onClick={onViewHistory}
          >
            View all history <ChevronRight size={16} />
          </button>
        </div>
        <ReadingsTable
          rows={readings}
          emptyTitle="No readings for this date"
          emptyMessage="Click Add reading or choose a meal slot above to log a glucose value."
          onAdd={() => onOpenModal({})}
          onEdit={(row) => onOpenModal({ reading: row })}
          onDelete={onDelete}
        />
      </section>
    </>
  );
}

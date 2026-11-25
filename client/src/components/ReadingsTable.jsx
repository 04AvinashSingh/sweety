import {
  Droplet,
  Moon,
  Pencil,
  Plus,
  Sun,
  Sunrise,
  Sunset,
  Trash2,
} from "lucide-react";
import { formatDate } from "../utils/dateUtils";
import { slots, tone } from "../utils/glucoseHelpers";

const slotIcons = [Sunrise, Sun, Sunset, Moon];

export default function ReadingsTable({
  rows,
  emptyTitle = "No readings logged",
  emptyMessage = "No readings found for this period.",
  onAdd,
  onEdit,
  onDelete,
  showDate = true,
}) {
  if (!rows.length) {
    return (
      <div className="empty">
        <Droplet size={28} />
        <h3>{emptyTitle}</h3>
        <p>{emptyMessage}</p>
        {onAdd && (
          <button type="button" className="secondary" onClick={onAdd}>
            <Plus size={16} /> Add reading
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Time slot</th>
            {showDate && <th>Date</th>}
            <th>Glucose level</th>
            <th className="text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const Icon = slotIcons[slots.indexOf(row.slot)] || Sunrise;
            return (
              <tr key={row.id}>
                <td>
                  <span className="slot-cell">
                    <span className="small-icon">
                      <Icon size={17} />
                    </span>
                    {row.slot}
                  </span>
                </td>
                {showDate && (
                  <td className="muted">{formatDate(row.reading_date)}</td>
                )}
                <td>
                  <span className={`value-badge ${tone(row.value)}`}>
                    <span className="status-dot" />
                    {row.value}
                    <small>mg/dl</small>
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Edit ${row.slot}`}
                      onClick={() => onEdit(row)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Delete ${row.slot}`}
                      onClick={() => onDelete(row)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

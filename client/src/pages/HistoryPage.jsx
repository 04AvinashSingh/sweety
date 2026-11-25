import ReadingsTable from "../components/ReadingsTable";
import { today } from "../utils/dateUtils";

export default function HistoryPage({
  history,
  page,
  filterDate,
  onChangeFilterDate,
  onChangePage,
  onOpenModal,
  onDelete,
}) {
  const rows = history?.data || [];
  const total = history?.pagination?.total || 0;
  const totalPages = Math.max(1, history?.pagination?.totalPages || 0);

  return (
    <section className="panel">
      <div className="panel-heading history-toolbar">
        <div>
          <h2>All readings</h2>
          <p className="muted">{total} total readings</p>
        </div>
        <div className="filter-row">
          <label htmlFor="history-filter" className="sr-only">
            Filter by date
          </label>
          <input
            id="history-filter"
            type="date"
            max={today()}
            value={filterDate}
            onChange={(e) => onChangeFilterDate(e.target.value)}
          />
          {filterDate && (
            <button
              type="button"
              className="secondary"
              onClick={() => onChangeFilterDate("")}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <ReadingsTable
        rows={rows}
        emptyTitle="No readings found"
        emptyMessage={
          filterDate
            ? "No readings recorded for this date."
            : "You haven't logged any readings yet."
        }
        onAdd={() => onOpenModal({})}
        onEdit={(row) => onOpenModal({ reading: row })}
        onDelete={onDelete}
      />

      {total > 0 && (
        <div className="pagination">
          <span className="muted">
            Page {page} of {totalPages}
          </span>
          <div className="pagination-controls">
            <button
              type="button"
              className="secondary"
              disabled={page <= 1}
              onClick={() => onChangePage(page - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="secondary"
              disabled={page >= totalPages}
              onClick={() => onChangePage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

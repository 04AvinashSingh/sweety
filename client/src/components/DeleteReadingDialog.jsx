import { useEffect, useRef } from "react";
import { formatDate } from "../utils/dateUtils";

export default function DeleteReadingDialog({
  reading,
  busy,
  error,
  onClose,
  onDelete,
}) {
  const dialog = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    dialog.current.showModal();
    return () => previous?.focus();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="delete-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <h2 id="delete-title">Delete reading?</h2>
      <p className="muted">
        {reading.slot} · {reading.value} mg/dl ·{" "}
        {formatDate(reading.reading_date)}
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button
          type="button"
          autoFocus
          className="secondary"
          disabled={busy}
          onClick={onClose}
        >
          Keep reading
        </button>
        <button
          type="button"
          className="danger"
          disabled={busy}
          onClick={onDelete}
        >
          {busy ? "Deleting…" : "Delete"}
        </button>
      </div>
    </dialog>
  );
}

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { slots } from "../utils/glucoseHelpers";
import { today } from "../utils/dateUtils";

export default function ReadingFormModal({
  reading,
  date,
  initialSlot,
  onClose,
  onSave,
}) {
  const dialog = useRef(null);
  const [value, setValue] = useState(reading?.value ?? "");
  const [slot, setSlot] = useState(reading?.slot || initialSlot || slots[0]);
  const [readingDate, setDate] = useState(reading?.reading_date || date);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const previous = document.activeElement;
    dialog.current.showModal();
    return () => previous?.focus();
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (String(value).trim() === "") {
      return setError("Please enter a glucose value.");
    }
    const numericValue = Number(value);
    if (
      !Number.isInteger(numericValue) ||
      numericValue < 40 ||
      numericValue > 600
    ) {
      return setError("Value must be between 40 and 600 mg/dl.");
    }
    if (!readingDate) {
      return setError("Please provide a valid date.");
    }
    if (readingDate > today()) {
      return setError("Date cannot be in the future.");
    }

    setBusy(true);
    setError("");
    try {
      await onSave({
        value: numericValue,
        slot,
        reading_date: readingDate,
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      aria-labelledby="modal-title"
    >
      <form onSubmit={submit} noValidate>
        <div className="modal-header">
          <h2 id="modal-title">{reading ? "Edit reading" : "Add reading"}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Close"
            onClick={onClose}
            disabled={busy}
          >
            <X size={20} />
          </button>
        </div>
        <p className="muted">
          {reading
            ? "Update the blood glucose reading below."
            : "Enter your blood glucose reading in mg/dl."}
        </p>

        <label htmlFor="glucose">Glucose value (mg/dl)</label>
        <input
          id="glucose"
          autoFocus
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 110"
        />

        <label htmlFor="slot">Time slot</label>
        <select
          id="slot"
          value={slot}
          onChange={(e) => setSlot(e.target.value)}
        >
          {slots.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <label htmlFor="reading-date">Date</label>
        <input
          id="reading-date"
          type="date"
          max={today()}
          value={readingDate}
          onChange={(e) => setDate(e.target.value)}
        />

        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button type="submit" className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save reading"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

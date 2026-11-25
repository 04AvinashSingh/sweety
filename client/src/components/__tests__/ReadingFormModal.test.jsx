import { describe, test, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ReadingFormModal from "../ReadingFormModal";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
});

const renderForm = (props = {}) =>
  render(
    <ReadingFormModal
      date="2026-01-01"
      onClose={vi.fn()}
      onSave={vi.fn()}
      {...props}
    />,
  );

describe("Reading modal", () => {
  test("renders labelled inputs and validates required value", () => {
    renderForm();
    expect(screen.getByLabelText("Time slot")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Save reading"));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please enter a glucose value.",
    );
  });

  test.each(["39", "601", "100.5"])(
    "validates whole number bounds for %s",
    (input) => {
      renderForm();
      fireEvent.change(screen.getByLabelText("Glucose value (mg/dl)"), {
        target: { value: input },
      });
      fireEvent.click(screen.getByText("Save reading"));
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Value must be between 40 and 600 mg/dl.",
      );
    },
  );

  test("validates future date", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Glucose value (mg/dl)"), {
      target: { value: "110" },
    });
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2099-01-01" },
    });
    fireEvent.click(screen.getByText("Save reading"));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Date cannot be in the future.",
    );
  });

  test("saves valid input", async () => {
    const save = vi.fn().mockResolvedValue({});
    renderForm({ onSave: save });
    fireEvent.change(screen.getByLabelText("Glucose value (mg/dl)"), {
      target: { value: "110" },
    });
    fireEvent.click(screen.getByText("Save reading"));
    expect(save).toHaveBeenCalledWith({
      value: 110,
      slot: "Morning (fasting)",
      reading_date: "2026-01-01",
    });
  });

  test("displays server validation errors", async () => {
    renderForm({
      onSave: vi
        .fn()
        .mockRejectedValue(new Error("You can add only 4 readings per day.")),
    });
    fireEvent.change(screen.getByLabelText("Glucose value (mg/dl)"), {
      target: { value: "110" },
    });
    fireEvent.click(screen.getByText("Save reading"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You can add only 4 readings per day.",
    );
  });

  test("closes when Cancel is clicked", () => {
    const onClose = vi.fn();
    renderForm({ onClose });
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

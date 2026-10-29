"use client";

import { CalendarChoiceAction, CalendarRehearsal } from "@/app/types";

const copy: Record<
  CalendarChoiceAction,
  { title: string; question: string; all: string }
> = {
  edit: {
    title: "Edit Rehearsal",
    question: "Would you like to edit just this date or all occurrences?",
    all: "All occurrences",
  },
  delete: {
    title: "Delete Rehearsal",
    question: "Would you like to delete just this date or the entire series?",
    all: "Entire series",
  },
  calendar: {
    title: "Add to Calendar",
    question: "Would you like to add just this date or the entire series?",
    all: "Entire series",
  },
};

interface CalendarModalDialogProps {
  target: CalendarRehearsal;
  action: CalendarChoiceAction;
  onClose: () => void;
  onChooseThis: () => void | Promise<void>;
  onChooseAll: () => void | Promise<void>;
}

export default function CalendarModalDialog({
  target,
  action,
  onClose,
  onChooseThis,
  onChooseAll,
}: CalendarModalDialogProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="section-header">
          <h3>{copy[action].title}</h3>
          <button className="button button-small" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="dialog-description">
          This is a {target.repeatType} rehearsal for{" "}
          <strong>{target.bandName}</strong>. {copy[action].question}
        </p>
        <div className="choice-dialog-actions">
          <button
            className={`button ${action === "delete" ? "button-tertiary button-tertiary-danger" : "button-tertiary"}`}
            onClick={onChooseThis}
          >
            Just this date
          </button>
          <button
            className={`button ${action === "delete" ? "button-danger" : "button-primary"}`}
            onClick={onChooseAll}
          >
            {copy[action].all}
          </button>
        </div>
      </div>
    </div>
  );
}

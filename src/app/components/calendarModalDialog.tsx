"use client";

import { CalendarChoiceAction, CalendarRehearsal } from "@/app/types";

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
          <h3>{action === "edit" ? "Edit Rehearsal" : "Delete Rehearsal"}</h3>
          <button className="button button-small" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="dialog-description">
          This is a {target.repeatType} rehearsal for{" "}
          <strong>{target.bandName}</strong>.{" "}
          {action === "edit"
            ? "Would you like to edit just this date or all occurrences?"
            : "Would you like to delete just this date or the entire series?"}
        </p>
        <div className="choice-dialog-actions">
          <button
            className={`button ${action === "delete" ? "button-tertiary-danger" : "button-tertiary"}`}
            onClick={onChooseThis}
          >
            Just this date
          </button>
          <button
            className={`button ${action === "delete" ? "button-danger" : "button-primary"}`}
            onClick={onChooseAll}
          >
            {action === "edit" ? "All occurrences" : "Entire series"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

// removing repeating day availability: just the selected day, or from it on

import { repeatLabel } from "@/app/lib/rehearsalUtils";
import { DayAvailability, DayAvailabilityRemoveScope } from "@/app/types";

interface DayAvailabilityRemoveDialogProps {
  schedule: DayAvailability;
  bandName: string;
  onClose: () => void;
  onChoose: (scope: DayAvailabilityRemoveScope) => void | Promise<void>;
}

export default function DayAvailabilityRemoveDialog({
  schedule,
  bandName,
  onClose,
  onChoose,
}: DayAvailabilityRemoveDialogProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="section-header">
          <h3>Remove Availability</h3>
          <button className="button button-small" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="dialog-description">
          You&apos;re free{" "}
          <strong>
            {repeatLabel(schedule.repeatType, schedule.date).toLowerCase()}
          </strong>{" "}
          for <strong>{bandName}</strong>. Would you like to remove just this
          day, or this day and every one after it?
        </p>
        <div className="choice-dialog-actions">
          <button
            className="button button-tertiary button-tertiary-danger"
            onClick={() => onChoose("this")}
          >
            Just this day
          </button>
          <button
            className="button button-danger"
            onClick={() => onChoose("future")}
          >
            This and future days
          </button>
        </div>
      </div>
    </div>
  );
}

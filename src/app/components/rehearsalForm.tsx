"use client";

import { useState, useEffect } from "react";
import {
  createRehearsalAction,
  updateRehearsalAction,
  cancelRehearsalOccurrenceAction,
} from "@/app/actions/rehearsals";
import { Band, Rehearsal, RehearsalRepeatType } from "@/app/types";

interface RehearsalFormProps {
  selectedDate: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  editRehearsal?: Rehearsal & { bandName?: string };
  editMode?: "all" | "this";
}

export default function RehearsalForm({
  selectedDate,
  onSuccess,
  onCancel,
  editRehearsal,
  editMode,
}: RehearsalFormProps) {
  const isEditing = !!editRehearsal;
  const isEditThis = isEditing && editMode === "this";

  const [bands, setBands] = useState<Band[]>([]);
  const [selectedBandId, setSelectedBandId] = useState(
    editRehearsal?.bandId ?? "",
  );
  const [repeatType, setRepeatType] = useState<RehearsalRepeatType>(
    isEditThis ? "once" : (editRehearsal?.repeatType ?? "once"),
  );
  const [startTime, setStartTime] = useState(editRehearsal?.startTime ?? "");
  const [endTime, setEndTime] = useState(editRehearsal?.endTime ?? "");
  const [notes, setNotes] = useState(editRehearsal?.notes ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEditing) return;
    async function fetchBands() {
      try {
        const response = await fetch("/api/bands");
        const data = await response.json();
        setBands(data.bands ?? []);
      } catch (error) {
        console.error("Error fetching bands:", error);
        setBands([]);
      }
    }
    fetchBands();
  }, [isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      if (isEditThis && editRehearsal) {
        // when "Edit this one" exclude the date from the recurring series, create a new one-off
        await cancelRehearsalOccurrenceAction(editRehearsal._id, selectedDate);
        await createRehearsalAction(
          editRehearsal.bandId,
          selectedDate,
          "once",
          startTime || undefined,
          endTime || undefined,
          notes || undefined,
        );
      } else if (isEditing && editRehearsal) {
        // when "Edit all" update the existing rehearsal
        await updateRehearsalAction(
          editRehearsal._id,
          editRehearsal.date,
          repeatType,
          startTime || undefined,
          endTime || undefined,
          notes || undefined,
        );
      } else {
        // create new rehearsal
        if (!selectedBandId) {
          setError("Please select a band");
          setIsSubmitting(false);
          return;
        }
        await createRehearsalAction(
          selectedBandId,
          selectedDate,
          repeatType,
          startTime || undefined,
          endTime || undefined,
          notes || undefined,
        );
      }
      if (onSuccess) onSuccess();
    } catch {
      setError(
        isEditing ? "Error updating rehearsal" : "Error creating rehearsal",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const dayName = selectedDate
    ? new Date(selectedDate + "T12:00:00").toLocaleDateString("en-GB", {
        weekday: "long",
        timeZone: "Europe/London",
      })
    : "";

  const title = isEditThis
    ? "Edit This Rehearsal"
    : isEditing
      ? "Edit All Rehearsals"
      : "Schedule Rehearsal";

  const submitLabel = isEditing ? "Save Changes" : "Schedule Rehearsal";

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="mgmt-header">
          <h3>{title}</h3>
          {onCancel && (
            <button className="btn btn-small" onClick={onCancel}>
              ✕
            </button>
          )}
        </div>

        <p className="rehearsal-form-date">
          {isEditing && editRehearsal?.bandName && (
            <strong>{editRehearsal.bandName} · </strong>
          )}
          {selectedDate
            ? new Date(selectedDate + "T12:00:00").toLocaleDateString("en-GB", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "Europe/London",
              })
            : ""}
        </p>

        {isEditThis && (
          <div className="alert alert--success" style={{ fontSize: "0.85rem" }}>
            This will create a separate one-off rehearsal for this date and
            remove it from the recurring series.
          </div>
        )}

        {error && <div className="alert alert--error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {!isEditing && (
            <div className="form-group">
              <label className="label">Band</label>
              <select
                className="input"
                value={selectedBandId}
                onChange={(e) => setSelectedBandId(e.target.value)}
              >
                <option value="">Select a band</option>
                {bands.map((band) => (
                  <option key={band._id} value={band._id}>
                    {band.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!isEditing && (
            <div className="form-group">
              <label className="label">Repeat</label>
              <div className="rehearsal-repeat-options">
                {(
                  [
                    { value: "once", label: "Just this day" },
                    { value: "weekly", label: `Every ${dayName}` },
                    { value: "biweekly", label: `Every other ${dayName}` },
                  ] as { value: RehearsalRepeatType; label: string }[]
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`btn btn-small ${repeatType === option.value ? "btn--primary" : "btn--tertiary"}`}
                    onClick={() => setRepeatType(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isEditing && !isEditThis && (
            <div className="form-group">
              <label className="label">Repeat</label>
              <div className="rehearsal-repeat-options">
                {(
                  [
                    { value: "once", label: "Just this day" },
                    { value: "weekly", label: `Every ${dayName}` },
                    { value: "biweekly", label: `Every other ${dayName}` },
                  ] as { value: RehearsalRepeatType; label: string }[]
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`btn btn-small ${repeatType === option.value ? "btn--primary" : "btn--tertiary"}`}
                    onClick={() => setRepeatType(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-group rehearsal-time-row">
            <div>
              <label className="label">Start Time</label>
              <input
                type="time"
                className="input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="label">End Time</label>
              <input
                type="time"
                className="input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Notes (optional)</label>
            <textarea
              className="input textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Location, things to bring, etc."
              rows={2}
            />
          </div>

          <div className="form-actions">
            {onCancel && (
              <button
                type="button"
                className="btn btn--tertiary"
                onClick={onCancel}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="btn btn--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

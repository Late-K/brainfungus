"use client";

import { useState, useEffect } from "react";
import {
  createRehearsalAction,
  updateRehearsalAction,
  cancelRehearsalOccurrenceAction,
} from "@/app/actions/rehearsals";
import { Band, Rehearsal, RehearsalRepeatType } from "@/app/types";
import { unwrapAction } from "@/app/lib/actionResult";
import RepeatOptions from "@/app/components/rehearsals/repeatOptions";
import BandSelect, {
  getOnlyBand,
} from "@/app/components/rehearsals/bandSelect";

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
  const [bandsLoaded, setBandsLoaded] = useState(false);
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
      } finally {
        setBandsLoaded(true);
      }
    }
    fetchBands();
  }, [isEditing]);

  const onlyBand = isEditing ? null : getOnlyBand(bands);
  const bandId = selectedBandId || onlyBand?._id || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      if (isEditThis && editRehearsal) {
        // when "Edit this one" exclude the date from the recurring series, create a new one-off
        unwrapAction(
          await cancelRehearsalOccurrenceAction(
            editRehearsal._id,
            selectedDate,
          ),
        );
        unwrapAction(
          await createRehearsalAction(
            editRehearsal.bandId,
            selectedDate,
            "once",
            startTime || undefined,
            endTime || undefined,
            notes || undefined,
          ),
        );
      } else if (isEditing && editRehearsal) {
        // when "Edit all" update the existing rehearsal
        unwrapAction(
          await updateRehearsalAction(
            editRehearsal._id,
            editRehearsal.date,
            repeatType,
            startTime || undefined,
            endTime || undefined,
            notes || undefined,
          ),
        );
      } else {
        // create new rehearsal
        if (!bandId) {
          setError("Please select a band");
          setIsSubmitting(false);
          return;
        }
        unwrapAction(
          await createRehearsalAction(
            bandId,
            selectedDate,
            repeatType,
            startTime || undefined,
            endTime || undefined,
            notes || undefined,
          ),
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

  const title = isEditThis
    ? "Edit This Rehearsal"
    : isEditing
      ? "Edit All Rehearsals"
      : "Schedule Rehearsal";

  const submitLabel = isEditing ? "Save Changes" : "Schedule Rehearsal";

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="section-header">
          <h3>{title}</h3>
          {onCancel && (
            <button className="button button-small" onClick={onCancel}>
              ✕
            </button>
          )}
        </div>

        <p className="rehearsal-form-date">
          {isEditing && editRehearsal?.bandName && (
            <strong>{editRehearsal.bandName} · </strong>
          )}
          {onlyBand && <strong>{onlyBand.name} · </strong>}
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
          <div className="alert alert-success alert-sm">
            This will create a separate one-off rehearsal for this date and
            remove it from the recurring series.
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {!isEditing && bandsLoaded && (
            <BandSelect
              bands={bands}
              value={selectedBandId}
              onChange={setSelectedBandId}
            />
          )}

          {!isEditThis && (
            <RepeatOptions
              date={selectedDate}
              value={repeatType}
              onChange={setRepeatType}
            />
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
                className="button button-tertiary"
                onClick={onCancel}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="button button-primary"
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

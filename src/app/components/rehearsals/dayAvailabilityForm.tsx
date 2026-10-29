"use client";

// marks the current user free on a day for one of their bands, once or
// repeating like a rehearsal

import { useState } from "react";
import RepeatOptions from "@/app/components/rehearsals/repeatOptions";
import BandSelect, {
  getOnlyBand,
} from "@/app/components/rehearsals/bandSelect";
import { RehearsalRepeatType } from "@/app/types";

interface DayAvailabilityFormProps {
  selectedDate: string;
  // bands the user isn't already free for that day
  bands: { _id: string; name: string }[];
  onSubmit: (repeatType: RehearsalRepeatType, bandId: string) => Promise<void>;
  onCancel: () => void;
}

export default function DayAvailabilityForm({
  selectedDate,
  bands,
  onSubmit,
  onCancel,
}: DayAvailabilityFormProps) {
  const [repeatType, setRepeatType] = useState<RehearsalRepeatType>("once");
  const [selectedBandId, setSelectedBandId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const onlyBand = getOnlyBand(bands);
  const bandId = selectedBandId || onlyBand?._id || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bandId) {
      setError("Please select a band");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit(repeatType, bandId);
    } catch {
      setError("Error saving availability");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="section-header">
          <h3>I&apos;m Free</h3>
          <button className="button button-small" onClick={onCancel}>
            ✕
          </button>
        </div>

        <p className="rehearsal-form-date">
          {onlyBand && <strong>{onlyBand.name} · </strong>}
          {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-GB", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "Europe/London",
          })}
        </p>

        <p className="dialog-description">
          Your bandmates will see you&apos;re free, and you&apos;ll be marked
          available for their rehearsals on these days unless you say otherwise.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <BandSelect
            bands={bands}
            value={selectedBandId}
            onChange={setSelectedBandId}
          />

          <RepeatOptions
            date={selectedDate}
            value={repeatType}
            onChange={setRepeatType}
          />

          <div className="form-actions">
            <button
              type="button"
              className="button button-tertiary"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

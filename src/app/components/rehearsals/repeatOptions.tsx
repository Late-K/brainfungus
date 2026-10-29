"use client";

// once / weekly / biweekly picker, shared by rehearsals and day availability

import { repeatLabel } from "@/app/lib/rehearsalUtils";
import { RehearsalRepeatType } from "@/app/types";

const repeat_types: RehearsalRepeatType[] = ["once", "weekly", "biweekly"];

interface RepeatOptionsProps {
  date: string;
  value: RehearsalRepeatType;
  onChange: (value: RehearsalRepeatType) => void;
}

export default function RepeatOptions({
  date,
  value,
  onChange,
}: RepeatOptionsProps) {
  return (
    <div className="form-group">
      <label className="label">Repeat</label>
      <div className="rehearsal-repeat-options">
        {repeat_types.map((option) => (
          <button
            key={option}
            type="button"
            className={`button button-small ${value === option ? "button-primary" : "button-tertiary"}`}
            onClick={() => onChange(option)}
          >
            {repeatLabel(option, date)}
          </button>
        ))}
      </div>
    </div>
  );
}

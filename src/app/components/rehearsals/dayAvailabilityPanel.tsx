"use client";

// the selected day's availability on the calendar, per band: whether the
// current user is free for it, and which bandmates are

import Link from "next/link";
import AvailableUsersRow from "@/app/components/rehearsals/availableUsersRow";
import {
  doesRehearsalOccurOnDate,
  getBandSchedules,
  getDayAvailableUsers,
  repeatLabel,
} from "@/app/lib/rehearsalUtils";
import {
  AvailUser,
  DayAvailability,
  DayAvailabilityInfo,
  DayAvailabilityUser,
} from "@/app/types";

interface DayAvailabilityPanelProps {
  selectedDate: string;
  me: DayAvailabilityUser | undefined;
  bands: { _id: string; name: string }[];
  dayAvailability: DayAvailabilityInfo | null;
  // false once the user is free for every band that day
  canAdd: boolean;
  onAdd: () => void;
  onRemove: (bandId: string, covering: DayAvailability[]) => void;
  onShowAllUsers: (users: AvailUser[]) => void;
}

export default function DayAvailabilityPanel({
  selectedDate,
  me,
  bands,
  dayAvailability,
  canAdd,
  onAdd,
  onRemove,
  onShowAllUsers,
}: DayAvailabilityPanelProps) {
  const day = new Date(selectedDate + "T12:00:00");

  // only bands someone is free for that day, to keep the panel short
  const rows = bands
    .map((band) => {
      const covering = getBandSchedules(me?.schedules ?? [], band._id).filter(
        (s) => doesRehearsalOccurOnDate(s, day),
      );
      return {
        band,
        covering,
        // a repeating one says more than a one-off if both cover the day
        shown: covering.find((s) => s.repeatType !== "once") ?? covering[0],
        users: getDayAvailableUsers(dayAvailability, band._id, selectedDate),
      };
    })
    .filter((row) => row.shown || row.users.length > 0);

  return (
    <div className="day-availability card-item card-item-compact">
      <div className="day-availability-row">
        <div className="day-availability-text">
          <span className="day-availability-title">Who&apos;s free</span>
          {rows.length === 0 && (
            <span className="day-availability-status">
              {bands.length === 0
                ? "Join a band to share the days you're free"
                : "Nobody's marked free"}
            </span>
          )}
        </div>
        {canAdd && (
          <button
            className="button button-small button-secondary"
            onClick={onAdd}
          >
            I&apos;m free
          </button>
        )}
      </div>

      {me?.paused && (
        <p className="day-availability-note">
          Your day availability is private, so bandmates can&apos;t see it and
          it won&apos;t mark you available for rehearsals.{" "}
          <Link href="/profile">Change</Link>
        </p>
      )}

      {rows.map(({ band, covering, shown, users }) => (
        <div key={band._id} className="day-availability-band">
          <div className="day-availability-row">
            <div className="day-availability-text">
              <span className="day-availability-band-name">{band.name}</span>
              {shown && (
                <span className="day-availability-status">
                  You&apos;re free · {repeatLabel(shown.repeatType, shown.date)}
                </span>
              )}
            </div>
            {shown && (
              <button
                className="button button-small button-tertiary button-tertiary-danger"
                onClick={() => onRemove(band._id, covering)}
              >
                Remove
              </button>
            )}
          </div>
          <AvailableUsersRow
            label="Free:"
            users={users}
            onShowAll={onShowAllUsers}
          />
        </div>
      ))}
    </div>
  );
}

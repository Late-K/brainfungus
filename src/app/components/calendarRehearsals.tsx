"use client";

import AvailableUsersRow from "@/app/components/availableUsersRow";
import AvailabilityToggleButton from "@/app/components/availabilityToggleButton";
import { doesRehearsalOccurOnDate } from "@/app/lib/rehearsalUtils";
import { AvailUser } from "@/app/types";
import { CalendarRehearsal } from "@/app/types";

interface CalendarRehearsalsProps {
  rehearsals: CalendarRehearsal[];
  selectedDate: string;
  onCreateRehearsal: () => void;
  onEditRehearsal: (rehearsal: CalendarRehearsal) => void;
  onDeleteRehearsal: (rehearsal: CalendarRehearsal) => void;
  onToggleAvailability: (rehearsal: CalendarRehearsal) => void | Promise<void>;
  getAvailabilityForDate: (
    rehearsal: CalendarRehearsal,
    date: string,
  ) => boolean;
  getAvailableUsersForDate: (
    rehearsal: CalendarRehearsal,
    date: string,
  ) => AvailUser[];
  onShowAllUsers: (users: AvailUser[]) => void;
}

export default function CalendarRehearsals({
  rehearsals,
  selectedDate,
  onCreateRehearsal,
  onEditRehearsal,
  onDeleteRehearsal,
  onToggleAvailability,
  getAvailabilityForDate,
  getAvailableUsersForDate,
  onShowAllUsers,
}: CalendarRehearsalsProps) {
  const rehearsalsForDate = rehearsals.filter((rehearsal) =>
    doesRehearsalOccurOnDate(rehearsal, new Date(selectedDate + "T12:00:00")),
  );

  const heading = new Date(selectedDate + "T12:00:00").toLocaleDateString(
    "en-GB",
    {
      weekday: "short",
      month: "long",
      day: "numeric",
      timeZone: "Europe/London",
    },
  );

  return (
    <div className="calendar-detail">
      <div className="calendar-detail-header">
        <h3>{heading}</h3>
        <button
          className="btn btn-small btn--primary"
          onClick={onCreateRehearsal}
        >
          + Rehearsal
        </button>
      </div>

      {rehearsalsForDate.length === 0 ? (
        <p className="empty-state">No rehearsals on this day</p>
      ) : (
        <div className="calendar-rehearsal-list">
          {rehearsalsForDate.map((rehearsal) => (
            <div key={rehearsal._id} className="calendar-rehearsal-item">
              <div className="calendar-rehearsal-info">
                <span className="calendar-rehearsal-band">
                  {rehearsal.bandName || "Unknown band"}
                </span>
              </div>
              <div className="calendar-rehearsal-info">
                <span className="calendar-rehearsal-time">
                  {rehearsal.startTime
                    ? `${rehearsal.startTime}${rehearsal.endTime ? " – " + rehearsal.endTime : ""}`
                    : "No time set"}
                </span>
              </div>
              {rehearsal.notes && (
                <p className="calendar-rehearsal-notes">{rehearsal.notes}</p>
              )}
              <AvailableUsersRow
                users={getAvailableUsersForDate(rehearsal, selectedDate)}
                maxVisible={5}
                onShowAll={onShowAllUsers}
              />
              <div className="calendar-rehearsal-actions">
                <AvailabilityToggleButton
                  available={getAvailabilityForDate(rehearsal, selectedDate)}
                  onClick={() => onToggleAvailability(rehearsal)}
                />
                <button
                  className="btn btn-small btn--tertiary"
                  onClick={() => onEditRehearsal(rehearsal)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-small btn--tertiary-danger"
                  onClick={() => onDeleteRehearsal(rehearsal)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

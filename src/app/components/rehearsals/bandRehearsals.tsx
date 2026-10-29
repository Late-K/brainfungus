"use client";

import { useEffect, useState } from "react";
import {
  getBandRehearsalsWithAvailabilityAction,
  setRehearsalAvailabilityAction,
} from "@/app/actions/rehearsals";
import {
  toDateStr,
  getMyRehearsalAvailability,
  getNextOccurrence,
  getRehearsalAvailableUsers,
  updateRehearsalAvatars,
} from "@/app/lib/rehearsalUtils";
import { formatShortDate } from "@/app/lib/utils";
import { AvailUser, CalendarRehearsal, DayAvailabilityInfo } from "@/app/types";
import ExpandedUserList from "@/app/components/ui/expandedUserList";
import AvailableUsersRow from "@/app/components/rehearsals/availableUsersRow";
import AvailabilityToggleButton from "@/app/components/rehearsals/availabilityToggleButton";
import CalendarModalDialog from "@/app/components/rehearsals/calendarModalDialog";
import { unwrapAction } from "@/app/lib/actionResult";
import { addRehearsalToCalendar } from "@/app/lib/calendarExport";

interface BandRehearsalsProps {
  bandId: string;
}

export default function BandRehearsals({ bandId }: BandRehearsalsProps) {
  const [rehearsals, setRehearsals] = useState<CalendarRehearsal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUsers, setExpandedUsers] = useState<AvailUser[] | null>(null);
  const [currentUser, setCurrentUser] = useState<AvailUser | null>(null);
  // a repeating rehearsal being added to a calendar, while asking how much of it
  const [calendarChoice, setCalendarChoice] = useState<{
    rehearsal: CalendarRehearsal;
    date: string;
  } | null>(null);
  const [dayAvailability, setDayAvailability] =
    useState<DayAvailabilityInfo | null>(null);

  const fetchRehearsals = async () => {
    try {
      const data = unwrapAction(
        await getBandRehearsalsWithAvailabilityAction(bandId),
      );
      setRehearsals(data.rehearsals ?? []);
      setDayAvailability(data.dayAvailability ?? null);
      if (data.currentUser) setCurrentUser(data.currentUser);
    } catch {
      setRehearsals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRehearsals();
  }, [bandId]);

  const upcoming = rehearsals
    .map((r) => ({ rehearsal: r, nextDate: getNextOccurrence(r) }))
    .filter((x) => x.nextDate !== null)
    .sort((a, b) => a.nextDate!.getTime() - b.nextDate!.getTime())
    .slice(0, 1);

  const getAvailForDate = (r: CalendarRehearsal, date: Date): boolean =>
    getMyRehearsalAvailability(
      r,
      toDateStr(date),
      currentUser?.userId,
      dayAvailability,
    );

  const getAvailUsersForDate = (r: CalendarRehearsal, date: Date) =>
    getRehearsalAvailableUsers(
      r,
      toDateStr(date),
      currentUser?.userId,
      dayAvailability,
    );

  const handleAvailabilityToggle = async (
    r: CalendarRehearsal,
    nextDate: Date,
  ) => {
    const dateStr = toDateStr(nextDate);
    const currentVal = getAvailForDate(r, nextDate);
    const newVal = !currentVal;

    const applyUpdate = (rr: CalendarRehearsal): CalendarRehearsal =>
      currentUser
        ? updateRehearsalAvatars(rr, dateStr, currentUser, newVal)
        : rr;

    if (r.repeatType !== "once") {
      setRehearsals((prev) =>
        prev.map((rr) =>
          rr._id === r._id
            ? applyUpdate({
                ...rr,
                occurrenceAvailability: {
                  ...rr.occurrenceAvailability,
                  [dateStr]: newVal,
                },
              })
            : rr,
        ),
      );
      try {
        unwrapAction(
          await setRehearsalAvailabilityAction(r._id, newVal, dateStr),
        );
      } catch {
        fetchRehearsals();
      }
    } else {
      setRehearsals((prev) =>
        prev.map((rr) =>
          rr._id === r._id ? applyUpdate({ ...rr, available: newVal }) : rr,
        ),
      );
      try {
        unwrapAction(await setRehearsalAvailabilityAction(r._id, newVal));
      } catch {
        fetchRehearsals();
      }
    }
  };

  if (loading) return null;

  if (upcoming.length === 0) {
    return (
      <p className="rehearsal-summary rehearsal-summary-empty">
        No upcoming rehearsals
      </p>
    );
  }

  return (
    <div className="rehearsal-summary" onClick={(e) => e.preventDefault()}>
      <p className="rehearsal-summary-title">Upcoming Rehearsals</p>
      <div className="list-compact">
        {upcoming.map(({ rehearsal: r, nextDate }) => (
          <div key={r._id} className="rehearsal-summary-item card-item">
            <div className="rehearsal-summary-row">
              <span className="rehearsal-summary-date">
                {formatShortDate(nextDate!)}
              </span>
              {r.startTime && (
                <span className="rehearsal-summary-time">
                  {r.startTime}
                  {r.endTime ? ` – ${r.endTime}` : ""}
                </span>
              )}
            </div>
            {r.notes && <p className="rehearsal-summary-notes">{r.notes}</p>}
            <AvailableUsersRow
              users={getAvailUsersForDate(r, nextDate!)}
              onShowAll={setExpandedUsers}
            />
            <div className="availability-controls">
              <AvailabilityToggleButton
                available={getAvailForDate(r, nextDate!)}
                onClick={() => handleAvailabilityToggle(r, nextDate!)}
              />
              <button
                className="button button-small button-tertiary"
                onClick={() =>
                  r.repeatType === "once"
                    ? addRehearsalToCalendar(r._id)
                    : setCalendarChoice({
                        rehearsal: r,
                        date: toDateStr(nextDate!),
                      })
                }
              >
                Add to calendar
              </button>
            </div>
          </div>
        ))}
      </div>

      {calendarChoice && (
        <CalendarModalDialog
          target={calendarChoice.rehearsal}
          action="calendar"
          onClose={() => setCalendarChoice(null)}
          onChooseThis={() => {
            addRehearsalToCalendar(
              calendarChoice.rehearsal._id,
              calendarChoice.date,
            );
            setCalendarChoice(null);
          }}
          onChooseAll={() => {
            addRehearsalToCalendar(calendarChoice.rehearsal._id);
            setCalendarChoice(null);
          }}
        />
      )}

      {/* Expanded available users modal */}
      {expandedUsers && (
        <ExpandedUserList
          title="Available Members"
          users={expandedUsers}
          onClose={() => setExpandedUsers(null)}
        />
      )}
    </div>
  );
}

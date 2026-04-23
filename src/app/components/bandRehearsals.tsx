"use client";

import { useEffect, useState } from "react";
import {
  getBandRehearsalsWithAvailabilityAction,
  setRehearsalAvailabilityAction,
} from "@/app/actions/rehearsals";
import {
  doesRehearsalOccurOnDate,
  toDateStr,
  getNextOccurrence,
  updateRehearsalAvatars,
} from "@/app/lib/rehearsalUtils";
import { formatShortDate } from "@/app/lib/utils";
import { AvailUser } from "@/app/types";
import ExpandedUserList from "@/app/components/expandedUserList";
import AvailableUsersRow from "@/app/components/availableUsersRow";
import AvailabilityToggleButton from "@/app/components/availabilityToggleButton";

interface RehearsalWithAvailability {
  _id: string;
  bandId: string;
  createdBy: string;
  date: string;
  startTime?: string;
  endTime?: string;
  repeatType: "once" | "weekly" | "biweekly";
  notes?: string;
  excludedDates?: string[];
  endDate?: string;
  myAvailability: {
    available: boolean;
    alwaysAvailable: boolean;
  };
  occurrenceAvailability?: Record<string, boolean>;
  availableUsersBase?: AvailUser[];
  availableUsersOcc?: Record<string, AvailUser[]>;
}

interface BandRehearsalsProps {
  bandId: string;
}

export default function BandRehearsals({ bandId }: BandRehearsalsProps) {
  const [rehearsals, setRehearsals] = useState<RehearsalWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUsers, setExpandedUsers] = useState<AvailUser[] | null>(null);
  const [currentUser, setCurrentUser] = useState<AvailUser | null>(null);

  const fetchRehearsals = async () => {
    try {
      const data = await getBandRehearsalsWithAvailabilityAction(bandId);
      setRehearsals(data.rehearsals ?? []);
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

  const getAvailForDate = (
    r: RehearsalWithAvailability,
    date: Date,
  ): boolean => {
    if (r.repeatType !== "once") {
      const ds = toDateStr(date);
      if (r.occurrenceAvailability?.[ds] !== undefined)
        return r.occurrenceAvailability[ds];
      return r.myAvailability.available;
    }
    return r.myAvailability.available;
  };

  const getAvailUsersForDate = (
    r: RehearsalWithAvailability,
    date: Date,
  ): AvailUser[] => {
    if (r.repeatType !== "once") {
      return r.availableUsersOcc?.[toDateStr(date)] ?? [];
    }
    return r.availableUsersBase ?? [];
  };

  const handleAvailabilityToggle = async (
    r: RehearsalWithAvailability,
    nextDate: Date,
  ) => {
    const dateStr = toDateStr(nextDate);
    const currentVal = getAvailForDate(r, nextDate);
    const newVal = !currentVal;

    const applyUpdate = (
      rr: RehearsalWithAvailability,
    ): RehearsalWithAvailability =>
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
        await setRehearsalAvailabilityAction(r._id, newVal, undefined, dateStr);
      } catch {
        fetchRehearsals();
      }
    } else {
      setRehearsals((prev) =>
        prev.map((rr) =>
          rr._id === r._id
            ? applyUpdate({
                ...rr,
                myAvailability: { ...rr.myAvailability, available: newVal },
              })
            : rr,
        ),
      );
      try {
        await setRehearsalAvailabilityAction(r._id, newVal);
      } catch {
        fetchRehearsals();
      }
    }
  };

  if (loading || upcoming.length === 0) return null;

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
              maxVisible={3}
              onShowAll={setExpandedUsers}
            />
            <div className="availability-controls">
              <AvailabilityToggleButton
                available={getAvailForDate(r, nextDate!)}
                onClick={() => handleAvailabilityToggle(r, nextDate!)}
              />
            </div>
          </div>
        ))}
      </div>

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

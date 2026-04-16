// calendar page
"use client";

import { useEffect, useState } from "react";
import Navbar from "@/app/components/navbar";
import CalendarView from "@/app/components/calendarView";
import RehearsalForm from "@/app/components/rehearsalForm";
import {
  getUserRehearsalsAction,
  deleteRehearsalAction,
  cancelRehearsalOccurrenceAction,
  endRehearsalSeriesAction,
  setRehearsalAvailabilityAction,
} from "../actions/rehearsals";
import { Rehearsal, AvailUser } from "@/app/types";
import {
  doesRehearsalOccurOnDate,
  toDateStr,
  updateRehearsalAvatars,
} from "@/app/lib/rehearsalUtils";
import ExpandedUserList from "@/app/components/expandedUserList";
import AvailableUsersRow from "@/app/components/availableUsersRow";
import AvailabilityToggleButton from "@/app/components/availabilityToggleButton";

interface RehearsalWithBand extends Rehearsal {
  bandName?: string;
  available?: boolean;
  occurrenceAvailability?: Record<string, boolean>;
  availableUsersBase?: AvailUser[];
  availableUsersOcc?: Record<string, AvailUser[]>;
}

type ChoiceAction = "edit" | "delete";

export default function CalendarPage() {
  const [rehearsals, setRehearsals] = useState<RehearsalWithBand[]>([]);
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));
  const [showForm, setShowForm] = useState(false);

  // edit state
  const [editRehearsal, setEditRehearsal] = useState<RehearsalWithBand | null>(
    null,
  );
  const [editMode, setEditMode] = useState<"all" | "this" | null>(null);

  // choice dialog state (for recurring: "edit this one or all?" / "delete this one or all?")
  const [choiceTarget, setChoiceTarget] = useState<RehearsalWithBand | null>(
    null,
  );
  const [choiceAction, setChoiceAction] = useState<ChoiceAction | null>(null);

  // expanded user list modal
  const [expandedUsers, setExpandedUsers] = useState<AvailUser[] | null>(null);
  const [currentUser, setCurrentUser] = useState<AvailUser | null>(null);

  const fetchRehearsals = async () => {
    try {
      const data = await getUserRehearsalsAction();
      setRehearsals((data.rehearsals ?? []) as RehearsalWithBand[]);
      if (data.currentUser) setCurrentUser(data.currentUser);
    } catch (error) {
      console.error("Error fetching rehearsals:", error);
    }
  };

  useEffect(() => {
    fetchRehearsals();
  }, []);

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditRehearsal(null);
    setEditMode(null);
    fetchRehearsals();
  };

  const closeForm = () => {
    setShowForm(false);
    setEditRehearsal(null);
    setEditMode(null);
  };

  // --- Edit flow ---
  const handleEditClick = (r: RehearsalWithBand) => {
    if (r.repeatType !== "once") {
      setChoiceTarget(r);
      setChoiceAction("edit");
    } else {
      // one-time: edit directly
      setEditRehearsal(r);
      setEditMode("all");
      setShowForm(true);
    }
  };

  const handleEditThis = () => {
    if (!choiceTarget) return;
    setEditRehearsal(choiceTarget);
    setEditMode("this");
    setShowForm(true);
    setChoiceTarget(null);
    setChoiceAction(null);
  };

  const handleEditAll = () => {
    if (!choiceTarget) return;
    setEditRehearsal(choiceTarget);
    setEditMode("all");
    setShowForm(true);
    setChoiceTarget(null);
    setChoiceAction(null);
  };

  // --- Delete flow ---
  const handleDeleteClick = (r: RehearsalWithBand) => {
    if (r.repeatType !== "once") {
      setChoiceTarget(r);
      setChoiceAction("delete");
    } else {
      handleDeleteAll(r._id);
    }
  };

  const handleDeleteThis = async () => {
    if (!choiceTarget) return;
    try {
      await cancelRehearsalOccurrenceAction(choiceTarget._id, selectedDate);
      fetchRehearsals();
    } catch {
      // silently fail
    }
    setChoiceTarget(null);
    setChoiceAction(null);
  };

  const handleDeleteAll = async (id?: string) => {
    const rehearsalId = id ?? choiceTarget?._id;
    const target = choiceTarget;
    if (!rehearsalId) return;
    try {
      // for recurring rehearsals, end the series from the selected date forward
      if (target && target.repeatType !== "once" && selectedDate) {
        await endRehearsalSeriesAction(rehearsalId, selectedDate);
      } else {
        await deleteRehearsalAction(rehearsalId);
      }
      fetchRehearsals();
    } catch {
      // silently fail
    }
    setChoiceTarget(null);
    setChoiceAction(null);
  };

  const closeChoice = () => {
    setChoiceTarget(null);
    setChoiceAction(null);
  };

  const getAvailabilityForDate = (
    r: RehearsalWithBand,
    date: string,
  ): boolean => {
    if (
      r.repeatType !== "once" &&
      r.occurrenceAvailability?.[date] !== undefined
    ) {
      return r.occurrenceAvailability[date];
    }
    return r.available ?? false;
  };

  const getAvailableUsersForDate = (
    r: RehearsalWithBand,
    date: string,
  ): AvailUser[] => {
    if (r.repeatType !== "once") {
      return r.availableUsersOcc?.[date] ?? [];
    }
    return r.availableUsersBase ?? [];
  };

  const handleAvailabilityToggle = async (r: RehearsalWithBand) => {
    const currentVal = getAvailabilityForDate(r, selectedDate);
    const newVal = !currentVal;

    const applyUpdate = (rr: RehearsalWithBand): RehearsalWithBand =>
      currentUser
        ? updateRehearsalAvatars(rr, selectedDate, currentUser, newVal)
        : rr;

    if (r.repeatType !== "once") {
      // optimistic update on occurrence map + avatars
      setRehearsals((prev) =>
        prev.map((rr) =>
          rr._id === r._id
            ? applyUpdate({
                ...rr,
                occurrenceAvailability: {
                  ...rr.occurrenceAvailability,
                  [selectedDate]: newVal,
                },
              })
            : rr,
        ),
      );
      try {
        await setRehearsalAvailabilityAction(
          r._id,
          newVal,
          undefined,
          selectedDate,
        );
      } catch {
        fetchRehearsals();
      }
    } else {
      // one-time: toggle base availability + avatars
      setRehearsals((prev) =>
        prev.map((rr) =>
          rr._id === r._id ? applyUpdate({ ...rr, available: newVal }) : rr,
        ),
      );
      try {
        await setRehearsalAvailabilityAction(r._id, newVal);
      } catch {
        fetchRehearsals();
      }
    }
  };

  const rehearsalsForDate = selectedDate
    ? rehearsals.filter((r) =>
        doesRehearsalOccurOnDate(r, new Date(selectedDate + "T12:00:00")),
      )
    : [];

  return (
    <div>
      <Navbar />
      <h2>Calendar</h2>

      <div className="calendar-container">
        <CalendarView rehearsals={rehearsals} onSelectDate={handleSelectDate} />
      </div>

      {selectedDate && (
        <div className="calendar-detail">
          <div className="calendar-detail-header">
            <h3>
              {new Date(selectedDate + "T12:00:00").toLocaleDateString(
                "en-GB",
                {
                  weekday: "short",
                  month: "long",
                  day: "numeric",
                  timeZone: "Europe/London",
                },
              )}
            </h3>
            <button
              className="btn btn-small btn--primary"
              onClick={() => {
                setEditRehearsal(null);
                setEditMode(null);
                setShowForm(true);
              }}
            >
              + Rehearsal
            </button>
          </div>

          {rehearsalsForDate.length === 0 ? (
            <p className="empty-state">No rehearsals on this day</p>
          ) : (
            <div className="calendar-rehearsal-list">
              {rehearsalsForDate.map((r) => (
                <div key={r._id} className="calendar-rehearsal-item">
                  <div className="calendar-rehearsal-info">
                    <span className="calendar-rehearsal-band">
                      {r.bandName || "Unknown band"}
                    </span>
                  </div>
                  <div className="calendar-rehearsal-info">
                    <span className="calendar-rehearsal-time">
                      {r.startTime
                        ? `${r.startTime}${r.endTime ? " – " + r.endTime : ""}`
                        : "No time set"}
                    </span>
                  </div>
                  {r.notes && (
                    <p className="calendar-rehearsal-notes">{r.notes}</p>
                  )}
                  <AvailableUsersRow
                    users={getAvailableUsersForDate(r, selectedDate)}
                    maxVisible={5}
                    onShowAll={setExpandedUsers}
                  />
                  <div className="calendar-rehearsal-actions">
                    <AvailabilityToggleButton
                      available={getAvailabilityForDate(r, selectedDate)}
                      onClick={() => handleAvailabilityToggle(r)}
                    />
                    <button
                      className="btn btn-small btn--tertiary"
                      onClick={() => handleEditClick(r)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-small btn--tertiary-danger"
                      onClick={() => handleDeleteClick(r)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Choice dialog for recurring rehearsals */}
      {choiceTarget && choiceAction && (
        <div className="modal-overlay" onClick={closeChoice}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mgmt-header">
              <h3>
                {choiceAction === "edit"
                  ? "Edit Rehearsal"
                  : "Delete Rehearsal"}
              </h3>
              <button className="btn btn-small" onClick={closeChoice}>
                ✕
              </button>
            </div>
            <p
              style={{
                margin: "0.5rem 0 1rem",
                fontSize: "0.9rem",
                color: "var(--muted)",
              }}
            >
              This is a {choiceTarget.repeatType} rehearsal for{" "}
              <strong>{choiceTarget.bandName}</strong>.{" "}
              {choiceAction === "edit"
                ? "Would you like to edit just this date or all occurrences?"
                : "Would you like to delete just this date or the entire series?"}
            </p>
            <div className="choice-dialog-actions">
              <button
                className={`btn ${choiceAction === "delete" ? "btn--tertiary-danger" : "btn--tertiary"}`}
                onClick={
                  choiceAction === "edit" ? handleEditThis : handleDeleteThis
                }
              >
                {choiceAction === "edit" ? "Just this date" : "Just this date"}
              </button>
              <button
                className={`btn ${choiceAction === "delete" ? "btn-danger" : "btn--primary"}`}
                onClick={
                  choiceAction === "edit"
                    ? handleEditAll
                    : () => handleDeleteAll()
                }
              >
                {choiceAction === "edit" ? "All occurrences" : "Entire series"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && selectedDate && (
        <RehearsalForm
          selectedDate={selectedDate}
          onSuccess={handleFormSuccess}
          onCancel={closeForm}
          editRehearsal={editRehearsal ?? undefined}
          editMode={editMode ?? undefined}
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

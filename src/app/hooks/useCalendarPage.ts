"use client";

import { useEffect, useState } from "react";
import {
  cancelRehearsalOccurrenceAction,
  deleteRehearsalAction,
  endRehearsalSeriesAction,
  getUserRehearsalsAction,
  setRehearsalAvailabilityAction,
} from "@/app/actions/rehearsals";
import { updateRehearsalAvatars, toDateStr } from "@/app/lib/rehearsalUtils";
import { AvailUser } from "@/app/types";
import {
  CalendarChoiceAction,
  CalendarEditMode,
  CalendarRehearsal,
} from "@/app/types";

export function useCalendarPage() {
  const [rehearsals, setRehearsals] = useState<CalendarRehearsal[]>([]);
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));
  const [showForm, setShowForm] = useState(false);
  const [editRehearsal, setEditRehearsal] = useState<CalendarRehearsal | null>(
    null,
  );
  const [editMode, setEditMode] = useState<CalendarEditMode | null>(null);
  const [choiceTarget, setChoiceTarget] = useState<CalendarRehearsal | null>(
    null,
  );
  const [choiceAction, setChoiceAction] = useState<CalendarChoiceAction | null>(
    null,
  );
  const [expandedUsers, setExpandedUsers] = useState<AvailUser[] | null>(null);
  const [currentUser, setCurrentUser] = useState<AvailUser | null>(null);

  const fetchRehearsals = async () => {
    try {
      const data = await getUserRehearsalsAction();
      setRehearsals((data.rehearsals ?? []) as CalendarRehearsal[]);
      if (data.currentUser) {
        setCurrentUser(data.currentUser);
      }
    } catch (error) {
      console.error("Error fetching rehearsals:", error);
    }
  };

  useEffect(() => {
    fetchRehearsals();
  }, []);

  const openCreateForm = () => {
    setEditRehearsal(null);
    setEditMode(null);
    setShowForm(true);
  };

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

  const handleEditClick = (rehearsal: CalendarRehearsal) => {
    if (rehearsal.repeatType !== "once") {
      setChoiceTarget(rehearsal);
      setChoiceAction("edit");
      return;
    }

    setEditRehearsal(rehearsal);
    setEditMode("all");
    setShowForm(true);
  };

  const handleEditThis = () => {
    if (!choiceTarget) {
      return;
    }

    setEditRehearsal(choiceTarget);
    setEditMode("this");
    setShowForm(true);
    setChoiceTarget(null);
    setChoiceAction(null);
  };

  const handleEditAll = () => {
    if (!choiceTarget) {
      return;
    }

    setEditRehearsal(choiceTarget);
    setEditMode("all");
    setShowForm(true);
    setChoiceTarget(null);
    setChoiceAction(null);
  };

  const handleDeleteClick = (rehearsal: CalendarRehearsal) => {
    if (rehearsal.repeatType !== "once") {
      setChoiceTarget(rehearsal);
      setChoiceAction("delete");
      return;
    }

    void handleDeleteAll(rehearsal._id);
  };

  const handleDeleteThis = async () => {
    if (!choiceTarget) {
      return;
    }

    try {
      await cancelRehearsalOccurrenceAction(choiceTarget._id, selectedDate);
      fetchRehearsals();
    } catch {
      // ignore and keep current state
    }

    setChoiceTarget(null);
    setChoiceAction(null);
  };

  const handleDeleteAll = async (rehearsalId?: string) => {
    const targetRehearsalId = rehearsalId ?? choiceTarget?._id;
    const target = choiceTarget;
    if (!targetRehearsalId) {
      return;
    }

    try {
      if (target && target.repeatType !== "once" && selectedDate) {
        await endRehearsalSeriesAction(targetRehearsalId, selectedDate);
      } else {
        await deleteRehearsalAction(targetRehearsalId);
      }
      fetchRehearsals();
    } catch {
      // ignore and keep current state
    }

    setChoiceTarget(null);
    setChoiceAction(null);
  };

  const closeChoice = () => {
    setChoiceTarget(null);
    setChoiceAction(null);
  };

  const getAvailabilityForDate = (
    rehearsal: CalendarRehearsal,
    date: string,
  ): boolean => {
    if (
      rehearsal.repeatType !== "once" &&
      rehearsal.occurrenceAvailability?.[date] !== undefined
    ) {
      return rehearsal.occurrenceAvailability[date];
    }

    return rehearsal.available ?? false;
  };

  const getAvailableUsersForDate = (
    rehearsal: CalendarRehearsal,
    date: string,
  ): AvailUser[] => {
    if (rehearsal.repeatType !== "once") {
      return rehearsal.availableUsersOcc?.[date] ?? [];
    }

    return rehearsal.availableUsersBase ?? [];
  };

  const handleAvailabilityToggle = async (rehearsal: CalendarRehearsal) => {
    const currentValue = getAvailabilityForDate(rehearsal, selectedDate);
    const nextValue = !currentValue;

    const applyUpdate = (value: CalendarRehearsal): CalendarRehearsal =>
      currentUser
        ? updateRehearsalAvatars(value, selectedDate, currentUser, nextValue)
        : value;

    if (rehearsal.repeatType !== "once") {
      setRehearsals((previous) =>
        previous.map((value) =>
          value._id === rehearsal._id
            ? applyUpdate({
                ...value,
                occurrenceAvailability: {
                  ...value.occurrenceAvailability,
                  [selectedDate]: nextValue,
                },
              })
            : value,
        ),
      );

      try {
        await setRehearsalAvailabilityAction(
          rehearsal._id,
          nextValue,
          undefined,
          selectedDate,
        );
      } catch {
        fetchRehearsals();
      }

      return;
    }

    setRehearsals((previous) =>
      previous.map((value) =>
        value._id === rehearsal._id
          ? applyUpdate({ ...value, available: nextValue })
          : value,
      ),
    );

    try {
      await setRehearsalAvailabilityAction(rehearsal._id, nextValue);
    } catch {
      fetchRehearsals();
    }
  };

  return {
    rehearsals,
    selectedDate,
    showForm,
    editRehearsal,
    editMode,
    choiceTarget,
    choiceAction,
    expandedUsers,
    setExpandedUsers,
    handleSelectDate,
    openCreateForm,
    handleFormSuccess,
    closeForm,
    handleEditClick,
    handleEditThis,
    handleEditAll,
    handleDeleteClick,
    handleDeleteThis,
    handleDeleteAll,
    closeChoice,
    getAvailabilityForDate,
    getAvailableUsersForDate,
    handleAvailabilityToggle,
  };
}

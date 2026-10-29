"use client";

import { useEffect, useState } from "react";
import {
  cancelRehearsalOccurrenceAction,
  deleteRehearsalAction,
  endRehearsalSeriesAction,
  getUserRehearsalsAction,
  setRehearsalAvailabilityAction,
} from "@/app/actions/rehearsals";
import {
  addDayAvailabilityAction,
  removeDayAvailabilityAction,
} from "@/app/actions/availability";
import {
  getBandSchedules,
  getMyRehearsalAvailability,
  getRehearsalAvailableUsers,
  isAvailableOnDay,
  updateRehearsalAvatars,
  toDateStr,
} from "@/app/lib/rehearsalUtils";
import { AvailUser } from "@/app/types";
import {
  CalendarChoiceAction,
  CalendarEditMode,
  CalendarRehearsal,
  DayAvailability,
  DayAvailabilityInfo,
  DayAvailabilityRemoveScope,
  RehearsalRepeatType,
} from "@/app/types";
import { unwrapAction } from "@/app/lib/actionResult";
import { addRehearsalToCalendar } from "@/app/lib/calendarExport";

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
  const [bands, setBands] = useState<{ _id: string; name: string }[]>([]);
  const [dayAvailability, setDayAvailability] =
    useState<DayAvailabilityInfo | null>(null);
  const [showDayForm, setShowDayForm] = useState(false);
  // the repeating availability being removed, while asking how much of it
  const [dayRemoveTarget, setDayRemoveTarget] =
    useState<DayAvailability | null>(null);

  const fetchRehearsals = async () => {
    try {
      const data = unwrapAction(await getUserRehearsalsAction());
      setRehearsals((data.rehearsals ?? []) as CalendarRehearsal[]);
      setBands(data.bands ?? []);
      setDayAvailability(data.dayAvailability ?? null);
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
      unwrapAction(
        await cancelRehearsalOccurrenceAction(choiceTarget._id, selectedDate),
      );
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
        unwrapAction(
          await endRehearsalSeriesAction(targetRehearsalId, selectedDate),
        );
      } else {
        unwrapAction(await deleteRehearsalAction(targetRehearsalId));
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

  // one-off rehearsals are added straight away, a series asks how much of it
  const handleAddToCalendarClick = (rehearsal: CalendarRehearsal) => {
    if (rehearsal.repeatType !== "once") {
      setChoiceTarget(rehearsal);
      setChoiceAction("calendar");
      return;
    }

    addRehearsalToCalendar(rehearsal._id);
  };

  const handleAddToCalendarThis = () => {
    if (!choiceTarget) {
      return;
    }

    addRehearsalToCalendar(choiceTarget._id, selectedDate);
    closeChoice();
  };

  const handleAddToCalendarAll = () => {
    if (!choiceTarget) {
      return;
    }

    addRehearsalToCalendar(choiceTarget._id);
    closeChoice();
  };

  const getAvailabilityForDate = (
    rehearsal: CalendarRehearsal,
    date: string,
  ): boolean =>
    getMyRehearsalAvailability(
      rehearsal,
      date,
      currentUser?.userId,
      dayAvailability,
    );

  const getAvailableUsersForDate = (
    rehearsal: CalendarRehearsal,
    date: string,
  ): AvailUser[] =>
    getRehearsalAvailableUsers(
      rehearsal,
      date,
      currentUser?.userId,
      dayAvailability,
    );

  const myDayAvailability = dayAvailability?.users.find(
    (u) => u.userId === currentUser?.userId,
  );

  // free that day for any band, for the calendar grid
  const isMyAvailableDay = (date: string) =>
    isAvailableOnDay(myDayAvailability?.schedules ?? [], date);

  // bands the current user isn't already free for on the selected day
  const addableDayBands = bands.filter(
    (band) =>
      !isAvailableOnDay(
        getBandSchedules(myDayAvailability?.schedules ?? [], band._id),
        selectedDate,
      ),
  );

  // throws so the form can show the error
  const handleAddDayAvailability = async (
    repeatType: RehearsalRepeatType,
    bandId: string,
  ) => {
    unwrapAction(
      await addDayAvailabilityAction(selectedDate, repeatType, bandId),
    );
    setShowDayForm(false);
    await fetchRehearsals();
  };

  const removeDayAvailability = async (
    bandId: string,
    scope: DayAvailabilityRemoveScope,
  ) => {
    setDayRemoveTarget(null);
    try {
      unwrapAction(
        await removeDayAvailabilityAction(selectedDate, scope, bandId),
      );
    } catch {
      // ignore and keep current state
    }
    await fetchRehearsals();
  };

  // repeating availability asks whether to remove just this day
  const handleRemoveDayAvailability = (
    bandId: string,
    covering: DayAvailability[],
  ) => {
    const repeating = covering.find((s) => s.repeatType !== "once");
    if (repeating) {
      setDayRemoveTarget(repeating);
      return;
    }
    void removeDayAvailability(bandId, "this");
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
        unwrapAction(
          await setRehearsalAvailabilityAction(
            rehearsal._id,
            nextValue,
            selectedDate,
          ),
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
      unwrapAction(
        await setRehearsalAvailabilityAction(rehearsal._id, nextValue),
      );
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
    handleAddToCalendarClick,
    handleAddToCalendarThis,
    handleAddToCalendarAll,
    getAvailabilityForDate,
    getAvailableUsersForDate,
    handleAvailabilityToggle,
    bands,
    dayAvailability,
    myDayAvailability,
    isMyAvailableDay,
    addableDayBands,
    showDayForm,
    setShowDayForm,
    dayRemoveTarget,
    setDayRemoveTarget,
    handleAddDayAvailability,
    handleRemoveDayAvailability,
    removeDayAvailability,
  };
}

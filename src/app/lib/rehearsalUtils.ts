import { Rehearsal, AvailUser } from "@/app/types";

interface HasAvailUsers {
  repeatType: string;
  availableUsersBase?: AvailUser[];
  availableUsersOcc?: Record<string, AvailUser[]>;
}

export function updateRehearsalAvatars<T extends HasAvailUsers>(
  rehearsal: T,
  dateStr: string,
  user: AvailUser,
  add: boolean,
): T {
  if (rehearsal.repeatType !== "once") {
    const occUsers = rehearsal.availableUsersOcc?.[dateStr] ?? [];
    const updated = add
      ? occUsers.some((u) => u.userId === user.userId)
        ? occUsers
        : [...occUsers, user]
      : occUsers.filter((u) => u.userId !== user.userId);
    return {
      ...rehearsal,
      availableUsersOcc: { ...rehearsal.availableUsersOcc, [dateStr]: updated },
    };
  } else {
    const baseUsers = rehearsal.availableUsersBase ?? [];
    const updated = add
      ? baseUsers.some((u) => u.userId === user.userId)
        ? baseUsers
        : [...baseUsers, user]
      : baseUsers.filter((u) => u.userId !== user.userId);
    return { ...rehearsal, availableUsersBase: updated };
  }
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getNextOccurrence(rehearsal: Rehearsal): Date | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (rehearsal.repeatType === "once") {
    const d = new Date(rehearsal.date);
    d.setHours(0, 0, 0, 0);
    return d >= today ? d : null;
  }

  for (let i = 0; i < 60; i++) {
    const check = new Date(today);
    check.setDate(check.getDate() + i);
    if (doesRehearsalOccurOnDate(rehearsal, check)) {
      return check;
    }
  }
  return null;
}

export function doesRehearsalOccurOnDate(
  rehearsal: Rehearsal,
  date: Date,
): boolean {
  // check excluded dates
  if (rehearsal.excludedDates?.length) {
    const dateStr = toDateStr(date);
    if (rehearsal.excludedDates.includes(dateStr)) return false;
  }

  const rehearsalDate = new Date(rehearsal.date + "T00:00:00");

  // check end date for recurring rehearsals
  if (rehearsal.endDate) {
    const end = new Date(rehearsal.endDate + "T23:59:59");
    if (date > end) return false;
  }

  if (rehearsal.repeatType === "once") {
    return isSameDay(rehearsalDate, date);
  } else if (rehearsal.repeatType === "weekly") {
    return rehearsalDate.getDay() === date.getDay() && rehearsalDate <= date;
  } else if (rehearsal.repeatType === "biweekly") {
    const diffInWeeks = Math.floor(
      (date.getTime() - rehearsalDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
    return (
      rehearsalDate.getDay() === date.getDay() &&
      diffInWeeks >= 0 &&
      diffInWeeks % 2 === 0
    );
  }
  return false;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function isRecurringRehearsal(rehearsal: Rehearsal): boolean {
  return (
    rehearsal.repeatType === "weekly" || rehearsal.repeatType === "biweekly"
  );
}

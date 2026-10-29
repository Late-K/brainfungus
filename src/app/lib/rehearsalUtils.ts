import {
  AvailUser,
  CalendarRehearsal,
  DayAvailability,
  DayAvailabilityInfo,
  Rehearsal,
  RepeatSchedule,
} from "@/app/types";

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

// older rehearsals have their date stored as a Date rather than YYYY-MM-DD,
// so it is always turned into a string before use or before going to the browser
export function rehearsalDateStr(date: unknown) {
  return date instanceof Date
    ? date.toISOString().slice(0, 10)
    : String(date).slice(0, 10);
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

// also used for day availability, which repeats the same way
export function doesRehearsalOccurOnDate(
  rehearsal: RepeatSchedule,
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
    // whole days first, so a clock change between the two dates can't knock
    // the week count down by one
    const diffInDays = Math.round(
      (date.getTime() - rehearsalDate.getTime()) / (24 * 60 * 60 * 1000),
    );
    const diffInWeeks = Math.floor(diffInDays / 7);
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

// "19:00-21:00", "19:00" or "" depending on which times were set
export function formatRehearsalTimes(startTime?: string, endTime?: string) {
  if (startTime && endTime) return `${startTime}-${endTime}`;
  return startTime ?? "";
}

// today's date as YYYY-MM-DD in uk time, since the server itself runs in utc
export function ukDateStr(date: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(
    date,
  );
}

export function addDaysToDateStr(dateStr: string, days: number) {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// whether any of a user's day availability covers the date (YYYY-MM-DD)
export function isAvailableOnDay(
  schedules: DayAvailability[],
  dateStr: string,
): boolean {
  const date = new Date(dateStr + "T12:00:00");
  return schedules.some((s) => doesRehearsalOccurOnDate(s, date));
}

// a user's day availability for one band
export function getBandSchedules(schedules: DayAvailability[], bandId: string) {
  return schedules.filter((s) => s.bandId === bandId);
}

// members of the band who are free that day for it, leaving out the current
// user if they've made theirs private
export function getDayAvailableUsers(
  info: DayAvailabilityInfo | null,
  bandId: string,
  dateStr: string,
): AvailUser[] {
  if (!info) return [];
  const memberIds = new Set(info.bandMemberIds[bandId] ?? []);
  return info.users
    .filter(
      (u) =>
        memberIds.has(u.userId) &&
        !u.paused &&
        isAvailableOnDay(getBandSchedules(u.schedules, bandId), dateStr),
    )
    .map(({ userId, userName, userEmail, userImage }) => ({
      userId,
      userName,
      userEmail,
      userImage,
    }));
}

// the current user's own answer for a rehearsal on a date, if they gave one
function getMyRehearsalAnswer(
  rehearsal: CalendarRehearsal,
  dateStr: string,
): boolean | undefined {
  return rehearsal.repeatType === "once"
    ? rehearsal.available
    : rehearsal.occurrenceAvailability?.[dateStr];
}

// an answer always wins - without one, being available that day counts as
// being available for the rehearsal
export function getMyRehearsalAvailability(
  rehearsal: CalendarRehearsal,
  dateStr: string,
  currentUserId: string | undefined,
  info: DayAvailabilityInfo | null,
): boolean {
  return (
    getMyRehearsalAnswer(rehearsal, dateStr) ??
    getDayAvailableUsers(info, rehearsal.bandId, dateStr).some(
      (u) => u.userId === currentUserId,
    )
  );
}

// everyone who said they're available, plus anyone free that day who hasn't
// answered
export function getRehearsalAvailableUsers(
  rehearsal: CalendarRehearsal,
  dateStr: string,
  currentUserId: string | undefined,
  info: DayAvailabilityInfo | null,
): AvailUser[] {
  const once = rehearsal.repeatType === "once";
  const answeredYes =
    (once
      ? rehearsal.availableUsersBase
      : rehearsal.availableUsersOcc?.[dateStr]) ?? [];
  const answeredNo = new Set(
    (once
      ? rehearsal.unavailableUserIdsBase
      : rehearsal.unavailableUserIdsOcc?.[dateStr]) ?? [],
  );
  const myAnswer = getMyRehearsalAnswer(rehearsal, dateStr);

  const fromDays = getDayAvailableUsers(info, rehearsal.bandId, dateStr).filter(
    (u) =>
      !answeredNo.has(u.userId) &&
      !answeredYes.some((a) => a.userId === u.userId) &&
      !(u.userId === currentUserId && myAnswer !== undefined),
  );
  return [...answeredYes, ...fromDays];
}

// "Just this day", "Every Tuesday" or "Every other Tuesday"
export function repeatLabel(
  repeatType: Rehearsal["repeatType"],
  dateStr: string,
) {
  const dayName = new Date(dateStr + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    timeZone: "Europe/London",
  });
  if (repeatType === "weekly") return `Every ${dayName}`;
  if (repeatType === "biweekly") return `Every other ${dayName}`;
  return "Just this day";
}

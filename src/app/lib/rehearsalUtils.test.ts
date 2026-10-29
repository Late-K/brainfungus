import { describe, expect, it } from "vitest";
import {
  addDaysToDateStr,
  doesRehearsalOccurOnDate,
  formatRehearsalTimes,
  getMyRehearsalAvailability,
  getRehearsalAvailableUsers,
  isAvailableOnDay,
  toDateStr,
} from "@/app/lib/rehearsalUtils";
import {
  AvailUser,
  CalendarRehearsal,
  DayAvailabilityInfo,
  Rehearsal,
} from "@/app/types";

// 2026-10-05 is a monday
const rehearsal = (fields: Partial<Rehearsal>) =>
  ({
    _id: "r1",
    bandId: "b1",
    createdBy: "u1",
    date: "2026-10-05",
    repeatType: "once",
    ...fields,
  }) as Rehearsal;

const day = (dateStr: string) => new Date(dateStr + "T00:00:00");

describe("doesRehearsalOccurOnDate", () => {
  it("one-off rehearsals only happen on their date", () => {
    const r = rehearsal({ repeatType: "once" });
    expect(doesRehearsalOccurOnDate(r, day("2026-10-05"))).toBe(true);
    expect(doesRehearsalOccurOnDate(r, day("2026-10-12"))).toBe(false);
  });

  it("weekly rehearsals repeat on the same weekday from the start date", () => {
    const r = rehearsal({ repeatType: "weekly" });
    expect(doesRehearsalOccurOnDate(r, day("2026-10-12"))).toBe(true);
    expect(doesRehearsalOccurOnDate(r, day("2026-10-13"))).toBe(false);
    expect(doesRehearsalOccurOnDate(r, day("2026-09-28"))).toBe(false);
  });

  it("biweekly rehearsals skip every other week", () => {
    const r = rehearsal({ repeatType: "biweekly" });
    expect(doesRehearsalOccurOnDate(r, day("2026-10-12"))).toBe(false);
    expect(doesRehearsalOccurOnDate(r, day("2026-10-19"))).toBe(true);
  });

  it("skips cancelled dates and anything after the end date", () => {
    const r = rehearsal({
      repeatType: "weekly",
      excludedDates: ["2026-10-12"],
      endDate: "2026-10-19",
    });
    expect(doesRehearsalOccurOnDate(r, day("2026-10-12"))).toBe(false);
    expect(doesRehearsalOccurOnDate(r, day("2026-10-19"))).toBe(true);
    expect(doesRehearsalOccurOnDate(r, day("2026-10-26"))).toBe(false);
  });

  it("biweekly rehearsals keep their weeks across the clocks going forward", () => {
    // 2027-03-28 is when uk clocks go forward
    const r = rehearsal({ date: "2027-03-15", repeatType: "biweekly" });
    expect(doesRehearsalOccurOnDate(r, day("2027-03-29"))).toBe(true);
    expect(doesRehearsalOccurOnDate(r, day("2027-04-05"))).toBe(false);
  });
});

const person = (userId: string): AvailUser => ({
  userId,
  userName: userId,
  userEmail: "",
});

// me and sam are free every monday from 2026-10-05 for band b1. sam is free
// for b2 too, but isn't in it
const dayInfo = (paused = false): DayAvailabilityInfo => ({
  users: [
    {
      ...person("me"),
      paused,
      schedules: [
        { _id: "d1", bandId: "b1", date: "2026-10-05", repeatType: "weekly" },
      ],
    },
    {
      ...person("sam"),
      schedules: [
        { _id: "d2", bandId: "b1", date: "2026-10-05", repeatType: "weekly" },
        { _id: "d3", bandId: "b2", date: "2026-10-05", repeatType: "weekly" },
      ],
    },
  ],
  bandMemberIds: { b1: ["me", "sam", "alex"], b2: ["me"] },
});

const weekly = (fields: Partial<CalendarRehearsal> = {}) =>
  rehearsal({ repeatType: "weekly", ...fields }) as CalendarRehearsal;

const ids = (users: AvailUser[]) => users.map((u) => u.userId);

describe("day availability", () => {
  it("covers repeating days but not cancelled ones", () => {
    const schedules = [
      {
        _id: "d1",
        bandId: "b1",
        date: "2026-10-05",
        repeatType: "biweekly" as const,
        excludedDates: ["2026-10-19"],
      },
    ];
    expect(isAvailableOnDay(schedules, "2026-10-05")).toBe(true);
    expect(isAvailableOnDay(schedules, "2026-10-12")).toBe(false);
    expect(isAvailableOnDay(schedules, "2026-10-19")).toBe(false);
    expect(isAvailableOnDay(schedules, "2026-11-02")).toBe(true);
  });

  it("marks band members free that day as available", () => {
    const r = weekly();
    expect(
      ids(getRehearsalAvailableUsers(r, "2026-10-12", "me", dayInfo())),
    ).toEqual(["me", "sam"]);
    expect(getMyRehearsalAvailability(r, "2026-10-12", "me", dayInfo())).toBe(
      true,
    );
    expect(
      getRehearsalAvailableUsers(r, "2026-10-13", "me", dayInfo()),
    ).toEqual([]);
  });

  it("only counts days set for the rehearsal's band, by its members", () => {
    const r = weekly({ bandId: "b2" });
    expect(
      getRehearsalAvailableUsers(r, "2026-10-12", "me", dayInfo()),
    ).toEqual([]);
    expect(getMyRehearsalAvailability(r, "2026-10-12", "me", dayInfo())).toBe(
      false,
    );
  });

  it("lets an answer override being free", () => {
    const r = weekly({
      occurrenceAvailability: { "2026-10-12": false },
      unavailableUserIdsOcc: { "2026-10-12": ["me", "sam"] },
    });
    expect(
      getRehearsalAvailableUsers(r, "2026-10-12", "me", dayInfo()),
    ).toEqual([]);
    expect(getMyRehearsalAvailability(r, "2026-10-12", "me", dayInfo())).toBe(
      false,
    );
    // other weeks still use the day availability
    expect(getMyRehearsalAvailability(r, "2026-10-19", "me", dayInfo())).toBe(
      true,
    );
  });

  it("doesn't list someone twice when they also answered yes", () => {
    const r = rehearsal({
      date: "2026-10-12",
      availableUsersBase: [person("sam")],
    } as Partial<CalendarRehearsal>) as CalendarRehearsal;
    expect(
      ids(getRehearsalAvailableUsers(r, "2026-10-12", "me", dayInfo())),
    ).toEqual(["sam", "me"]);
  });

  it("ignores the current user's days while they're private", () => {
    const r = weekly();
    expect(
      getMyRehearsalAvailability(r, "2026-10-12", "me", dayInfo(true)),
    ).toBe(false);
    expect(
      ids(getRehearsalAvailableUsers(r, "2026-10-12", "me", dayInfo(true))),
    ).toEqual(["sam"]);
  });
});

describe("date helpers", () => {
  it("formats local dates as YYYY-MM-DD", () => {
    expect(toDateStr(new Date(2026, 0, 3))).toBe("2026-01-03");
  });

  it("adds days across month and year ends", () => {
    expect(addDaysToDateStr("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToDateStr("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("formats rehearsal times", () => {
    expect(formatRehearsalTimes("19:00", "21:00")).toBe("19:00-21:00");
    expect(formatRehearsalTimes("19:00")).toBe("19:00");
    expect(formatRehearsalTimes()).toBe("");
  });
});

import { describe, expect, it } from "vitest";
import {
  addDaysToDateStr,
  doesRehearsalOccurOnDate,
  formatRehearsalTimes,
  toDateStr,
} from "@/app/lib/rehearsalUtils";
import { Rehearsal } from "@/app/types";

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

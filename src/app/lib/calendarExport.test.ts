import { describe, expect, it } from "vitest";
import {
  buildRehearsalIcs,
  CalendarExportRehearsal,
  rehearsalCalendarUrl,
  rehearsalIcsFilename,
} from "@/app/lib/calendarExport";

const now = new Date("2026-10-29T08:30:00Z");

// 2026-10-05 is a monday
const rehearsal = (fields: Partial<CalendarExportRehearsal> = {}) => ({
  _id: "r1",
  date: "2026-10-05",
  repeatType: "once" as const,
  startTime: "19:00",
  endTime: "21:00",
  ...fields,
});

// the file's lines with folded lines joined back up
const lines = (ics: string) => ics.replace(/\r\n /g, "").split("\r\n");

describe("buildRehearsalIcs", () => {
  it("makes a one-off timed event in uk time", () => {
    const ics = buildRehearsalIcs(rehearsal(), { bandName: "The Fungi", now });
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(lines(ics)).toEqual(
      expect.arrayContaining([
        "BEGIN:VTIMEZONE",
        "UID:r1@brainfungus",
        "DTSTAMP:20261029T083000Z",
        "DTSTART;TZID=Europe/London:20261005T190000",
        "DTEND;TZID=Europe/London:20261005T210000",
        "SUMMARY:The Fungi rehearsal",
      ]),
    );
    expect(ics).not.toContain("RRULE:FREQ=WEEKLY");
  });

  it("makes an all day event when there's no start time", () => {
    const ics = buildRehearsalIcs(
      rehearsal({ startTime: undefined, endTime: undefined }),
      { bandName: "B", now },
    );
    expect(lines(ics)).toEqual(
      expect.arrayContaining([
        "DTSTART;VALUE=DATE:20261005",
        "DTEND;VALUE=DATE:20261006",
      ]),
    );
    expect(ics).not.toContain("VTIMEZONE");
  });

  it("runs past midnight, and defaults to two hours without an end", () => {
    const late = lines(
      buildRehearsalIcs(rehearsal({ startTime: "23:00", endTime: "01:00" }), {
        bandName: "B",
        now,
      }),
    );
    expect(late).toContain("DTEND;TZID=Europe/London:20261006T010000");

    const open = lines(
      buildRehearsalIcs(rehearsal({ endTime: undefined }), {
        bandName: "B",
        now,
      }),
    );
    expect(open).toContain("DURATION:PT2H");
  });

  it("repeats a whole series, skipping cancelled dates up to its end", () => {
    const ics = buildRehearsalIcs(
      rehearsal({
        repeatType: "biweekly",
        excludedDates: ["2026-10-19", "2026-11-02"],
        endDate: "2026-12-31",
      }),
      { bandName: "B", now },
    );
    expect(lines(ics)).toEqual(
      expect.arrayContaining([
        "DTSTART;TZID=Europe/London:20261005T190000",
        "RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=20261231T235959Z",
        "EXDATE;TZID=Europe/London:20261019T190000,20261102T190000",
      ]),
    );
  });

  it("adds just one date of a series with its own id", () => {
    const ics = buildRehearsalIcs(rehearsal({ repeatType: "weekly" }), {
      bandName: "B",
      occurrenceDate: "2026-10-12",
      now,
    });
    expect(lines(ics)).toEqual(
      expect.arrayContaining([
        "UID:r1-20261012@brainfungus",
        "DTSTART;TZID=Europe/London:20261012T190000",
      ]),
    );
    expect(ics).not.toContain("RRULE:FREQ=WEEKLY");
  });

  it("escapes text and folds long lines", () => {
    const ics = buildRehearsalIcs(
      rehearsal({
        notes: "Bring cables, picks; snacks\nRoom 4 " + "x".repeat(80),
      }),
      { bandName: "Rock, Paper", url: "https://example.test/bands/b1", now },
    );
    expect(ics.split("\r\n").every((l) => l.length <= 75)).toBe(true);
    expect(lines(ics)).toEqual(
      expect.arrayContaining([
        "SUMMARY:Rock\\, Paper rehearsal",
        `DESCRIPTION:Bring cables\\, picks\\; snacks\\nRoom 4 ${"x".repeat(80)}\\n\\nhttps://example.test/bands/b1`,
        "URL:https://example.test/bands/b1",
      ]),
    );
  });

  it("never lets notes start a line of their own", () => {
    const ics = buildRehearsalIcs(
      rehearsal({ notes: "a\rATTENDEE:x\r\nb\nc" }),
      { bandName: "B", now },
    );
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    expect(lines(ics)).toContain("DESCRIPTION:a\\nATTENDEE:x\\nb\\nc");
  });
});

describe("calendar file names and links", () => {
  it("names files after the band", () => {
    expect(rehearsalIcsFilename("The Fungi!", "2026-10-05")).toBe(
      "the-fungi-rehearsal-2026-10-05.ics",
    );
    expect(rehearsalIcsFilename("★")).toBe("band-rehearsals.ics");
  });

  it("links to one date or the whole rehearsal", () => {
    expect(rehearsalCalendarUrl("r1")).toBe("/api/rehearsals/r1/calendar");
    expect(rehearsalCalendarUrl("r1", "2026-10-12")).toBe(
      "/api/rehearsals/r1/calendar?date=2026-10-12",
    );
  });
});

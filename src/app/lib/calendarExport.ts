// adding rehearsals to a phone or computer calendar as .ics files. the file
// itself is made by /api/rehearsals/[id]/calendar, which uses
// buildRehearsalIcs, so ios opens its "add to calendar" sheet for it

import { addDaysToDateStr } from "@/app/lib/rehearsalUtils";
import { RepeatSchedule } from "@/app/types";

const TIME_ZONE = "Europe/London";
// rehearsals with a start time but no end time
const DEFAULT_DURATION = "PT2H";

// uk clock changes, so calendars place timed rehearsals at the right hour
const LONDON_TIMEZONE = [
  "BEGIN:VTIMEZONE",
  `TZID:${TIME_ZONE}`,
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0000",
  "TZOFFSETTO:+0100",
  "TZNAME:BST",
  "DTSTART:19700329T010000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0000",
  "TZNAME:GMT",
  "DTSTART:19701025T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

export interface CalendarExportRehearsal extends RepeatSchedule {
  _id: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

interface CalendarExportOptions {
  bandName: string;
  // just this date of a repeating rehearsal, rather than the whole series
  occurrenceDate?: string;
  // the band page, linked from the event
  url?: string;
  now?: Date;
}

// commas, semicolons, backslashes and newlines have to be escaped in text.
// a lone \r counts as a newline too, since some calendars end a line on it
// and the rest of the text would become a line of its own
function escapeText(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

const encoder = new TextEncoder();

// lines over 75 bytes are split, with each extra line starting with a space
function foldLine(line: string) {
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > 75) {
      parts.push(current);
      current = " ";
      bytes = 1;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n");
}

// "2026-10-29" -> "20261029"
function icsDate(dateStr: string) {
  return dateStr.replace(/-/g, "");
}

// "2026-10-29", "19:00" -> "20261029T190000"
function icsDateTime(dateStr: string, time: string) {
  return `${icsDate(dateStr)}T${time.replace(":", "")}00`;
}

// the date and time lines for when the rehearsal starts and ends
function timingLines(date: string, startTime?: string, endTime?: string) {
  if (!startTime) {
    return [
      `DTSTART;VALUE=DATE:${icsDate(date)}`,
      `DTEND;VALUE=DATE:${icsDate(addDaysToDateStr(date, 1))}`,
    ];
  }
  const start = `DTSTART;TZID=${TIME_ZONE}:${icsDateTime(date, startTime)}`;
  if (!endTime) return [start, `DURATION:${DEFAULT_DURATION}`];
  // an end time before the start runs past midnight
  const endDate = endTime > startTime ? date : addDaysToDateStr(date, 1);
  return [start, `DTEND;TZID=${TIME_ZONE}:${icsDateTime(endDate, endTime)}`];
}

// repeat rule and cancelled dates for a whole weekly or biweekly series
function repeatLines(rehearsal: CalendarExportRehearsal) {
  const allDay = !rehearsal.startTime;
  let rule = `RRULE:FREQ=WEEKLY;INTERVAL=${rehearsal.repeatType === "biweekly" ? 2 : 1}`;
  if (rehearsal.endDate) {
    rule += `;UNTIL=${icsDate(rehearsal.endDate)}${allDay ? "" : "T235959Z"}`;
  }
  const lines = [rule];

  const excluded = rehearsal.excludedDates ?? [];
  if (excluded.length > 0) {
    lines.push(
      allDay
        ? `EXDATE;VALUE=DATE:${excluded.map(icsDate).join(",")}`
        : `EXDATE;TZID=${TIME_ZONE}:${excluded
            .map((d) => icsDateTime(d, rehearsal.startTime!))
            .join(",")}`,
    );
  }
  return lines;
}

// an .ics calendar with the rehearsal in it - one date, or the whole series
// when it repeats and no occurrence date is given
export function buildRehearsalIcs(
  rehearsal: CalendarExportRehearsal,
  { bandName, occurrenceDate, url, now = new Date() }: CalendarExportOptions,
) {
  const series = rehearsal.repeatType !== "once" && !occurrenceDate;
  const date = occurrenceDate ?? rehearsal.date;
  const stamp = now.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const description = [rehearsal.notes, url].filter(Boolean).join("\n\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Brain Fungus//Rehearsals//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...(rehearsal.startTime ? LONDON_TIMEZONE : []),
    "BEGIN:VEVENT",
    // a single date of a series gets its own id, so it doesn't replace the
    // series if both are added
    `UID:${rehearsal._id}${occurrenceDate && rehearsal.repeatType !== "once" ? `-${icsDate(occurrenceDate)}` : ""}@brainfungus`,
    `DTSTAMP:${stamp}`,
    ...timingLines(date, rehearsal.startTime, rehearsal.endTime),
    ...(series ? repeatLines(rehearsal) : []),
    `SUMMARY:${escapeText(`${bandName} rehearsal`)}`,
    ...(description ? [`DESCRIPTION:${escapeText(description)}`] : []),
    ...(url ? [`URL:${url}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map(foldLine).join("\r\n") + "\r\n";
}

// "the-fungi-rehearsal-2026-10-29.ics", or "the-fungi-rehearsals.ics" for a series
export function rehearsalIcsFilename(bandName: string, date?: string) {
  const slug =
    bandName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "band";
  return date ? `${slug}-rehearsal-${date}.ics` : `${slug}-rehearsals.ics`;
}

// the calendar file for a rehearsal: just one date of it, or all of it
export function rehearsalCalendarUrl(rehearsalId: string, date?: string) {
  const path = `/api/rehearsals/${encodeURIComponent(rehearsalId)}/calendar`;
  return date ? `${path}?date=${date}` : path;
}

// opens the calendar file. phones offer to add it to their calendar,
// computers download it to open in theirs
export function addRehearsalToCalendar(rehearsalId: string, date?: string) {
  window.location.assign(rehearsalCalendarUrl(rehearsalId, date));
}

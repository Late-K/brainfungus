import { getAuthUser } from "@/app/lib/server/auth";
import { UserError } from "@/app/lib/actionResult";
import {
  requireBandMember,
  serverErrorResponse,
  toObjectId,
} from "@/app/lib/server/utils";
import { readDateStr } from "@/app/lib/validate";
import {
  doesRehearsalOccurOnDate,
  rehearsalDateStr,
} from "@/app/lib/rehearsalUtils";
import {
  buildRehearsalIcs,
  rehearsalIcsFilename,
} from "@/app/lib/calendarExport";
import { NextRequest, NextResponse } from "next/server";

// a rehearsal as an .ics file to add to a calendar, for members of its band.
// ?date=YYYY-MM-DD gives just that date of a repeating rehearsal, otherwise
// it's the whole series
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const rehearsalObjectId = toObjectId(id, "rehearsal ID");
    const dateParam = request.nextUrl.searchParams.get("date");
    const occurrenceDate =
      dateParam === null ? undefined : readDateStr(dateParam);
    const { db, user } = await getAuthUser();

    const doc = await db
      .collection("rehearsals")
      .findOne({ _id: rehearsalObjectId });
    if (!doc) throw new UserError("Rehearsal not found");
    const { band, bandObjectId } = await requireBandMember(
      db,
      user._id.toString(),
      doc.bandId,
    );

    const rehearsal = {
      _id: id,
      date: rehearsalDateStr(doc.date),
      repeatType: doc.repeatType,
      startTime: doc.startTime,
      endTime: doc.endTime,
      notes: doc.notes,
      excludedDates: doc.excludedDates ?? [],
      endDate: doc.endDate,
    };
    if (
      occurrenceDate &&
      !doesRehearsalOccurOnDate(
        rehearsal,
        new Date(occurrenceDate + "T12:00:00"),
      )
    ) {
      throw new UserError("Rehearsal isn't on that date");
    }

    const bandName = (band.name as string) || "Band";
    const single = rehearsal.repeatType === "once" || occurrenceDate;
    const ics = buildRehearsalIcs(rehearsal, {
      bandName,
      occurrenceDate,
      url: `${request.nextUrl.origin}/bands/${bandObjectId.toString()}`,
    });

    return new NextResponse(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${rehearsalIcsFilename(
          bandName,
          single ? (occurrenceDate ?? rehearsal.date) : undefined,
        )}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return serverErrorResponse(error, "Failed to create calendar file");
  }
}

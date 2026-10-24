// daily rehearsal reminders - vercel cron calls this every morning (see vercel.json)
// and every band member gets a push for rehearsals happening today and tomorrow

import { ObjectId } from "mongodb";
import { getDb } from "@/app/lib/mongodb";
import { sendPushToUsers } from "@/app/lib/push";
import {
  addDaysToDateStr,
  doesRehearsalOccurOnDate,
  formatRehearsalTimes,
  ukDateStr,
} from "@/app/lib/rehearsalUtils";
import { Rehearsal } from "@/app/types";

export async function GET(request: Request) {
  // vercel sends CRON_SECRET as a bearer token, so nobody else can trigger reminders
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getDb();
    const today = ukDateStr();
    const days = [
      { dateStr: today, label: "today" },
      { dateStr: addDaysToDateStr(today, 1), label: "tomorrow" },
    ];

    // skip series that have already ended
    const rehearsals = await db
      .collection("rehearsals")
      .find({
        $or: [{ endDate: { $exists: false } }, { endDate: { $gte: today } }],
      })
      .toArray();

    const bandIds = [...new Set(rehearsals.map((r) => r.bandId.toString()))];
    const bands = await db
      .collection("bands")
      .find({ _id: { $in: bandIds.map((id) => new ObjectId(id)) } })
      .project({ name: 1, members: 1 })
      .toArray();
    const bandMap = new Map(bands.map((b) => [b._id.toString(), b]));

    let sent = 0;
    for (const r of rehearsals) {
      const band = bandMap.get(r.bandId.toString());
      if (!band) continue;

      const rehearsal = {
        ...r,
        _id: r._id.toString(),
        bandId: r.bandId.toString(),
        createdBy: r.createdBy?.toString(),
        date:
          r.date instanceof Date
            ? r.date.toISOString().slice(0, 10)
            : String(r.date).slice(0, 10),
      } as Rehearsal;

      for (const { dateStr, label } of days) {
        // dates are parsed in server time on both sides, so this matches the stored YYYY-MM-DD
        if (!doesRehearsalOccurOnDate(rehearsal, new Date(dateStr + "T00:00:00"))) {
          continue;
        }

        // remember what's been sent so a retried cron run doesn't double up
        const marker = await db.collection("rehearsal_reminders").updateOne(
          { rehearsalId: r._id, occurrenceDate: dateStr, label },
          { $setOnInsert: { sentAt: new Date() } },
          { upsert: true },
        );
        if (marker.upsertedCount === 0) continue;

        const memberIds = ((band.members as Array<{ userId: string }>) ?? [])
          .map((m) => m.userId)
          .filter((id) => ObjectId.isValid(id))
          .map((id) => new ObjectId(id));

        const times = formatRehearsalTimes(r.startTime, r.endTime);
        await sendPushToUsers(db, memberIds, "rehearsals", rehearsal.bandId, {
          title: band.name,
          body: `Rehearsal ${label}${times ? ` at ${times}` : ""}${r.notes ? ` - ${r.notes}` : ""}`,
          url: `/bands/${rehearsal.bandId}`,
          tag: `rehearsal-${rehearsal._id}-${dateStr}`,
        });
        sent++;
      }
    }

    return Response.json({ success: true, reminders: sent });
  } catch (error) {
    console.error("Failed to send rehearsal reminders:", error);
    return Response.json(
      { error: "Failed to send rehearsal reminders" },
      { status: 500 },
    );
  }
}

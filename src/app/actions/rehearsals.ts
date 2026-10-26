"use server";

import { getAuthUser } from "@/app/lib/server/auth";
import { AnyBulkWriteOperation, Db, Document, ObjectId } from "mongodb";
import {
  doesRehearsalOccurOnDate,
  formatRehearsalTimes,
  toDateStr,
} from "@/app/lib/rehearsalUtils";
import { notifyBandMembers } from "@/app/lib/server/push";
import {
  requireBandMember,
  requireBandMemberContext,
  toObjectId,
  toObjectIds,
} from "@/app/lib/server/utils";
import { runAction, UserError } from "@/app/lib/actionResult";
import {
  readBoolean,
  readDateStr,
  readOneOf,
  readOptionalString,
  readOptionalTime,
} from "@/app/lib/validate";
import { AvailUser, RehearsalRepeatType } from "@/app/types";

const REPEAT_TYPES: RehearsalRepeatType[] = ["once", "weekly", "biweekly"];

// the date, times, repeat and notes shared by creating and editing a rehearsal
function readRehearsalFields(
  date: unknown,
  repeatType: unknown,
  startTime: unknown,
  endTime: unknown,
  notes: unknown,
) {
  return {
    date: readDateStr(date),
    repeatType: readOneOf(repeatType, REPEAT_TYPES, "repeat"),
    startTime: readOptionalTime(startTime, "start time"),
    endTime: readOptionalTime(endTime, "end time"),
    notes: readOptionalString(notes, "notes", 1000) ?? "",
  };
}

// loads a rehearsal and checks the current user is in its band
async function requireRehearsal(rehearsalId: unknown) {
  const rehearsalObjectId = toObjectId(rehearsalId, "rehearsal ID");
  const { db, user } = await getAuthUser();

  const rehearsal = await db
    .collection("rehearsals")
    .findOne({ _id: rehearsalObjectId });
  if (!rehearsal) {
    throw new UserError("Rehearsal not found");
  }

  await requireBandMember(db, user._id.toString(), rehearsal.bandId);
  return { db, user, rehearsal, rehearsalObjectId };
}

async function deleteRehearsal(db: Db, rehearsalObjectId: ObjectId) {
  await db.collection("rehearsals").deleteOne({ _id: rehearsalObjectId });
  await db
    .collection("rehearsal_availability")
    .deleteMany({ rehearsalId: rehearsalObjectId });
}

function currentUserInfo(user: Document) {
  return {
    userId: user._id.toString(),
    userName: user.name || "Unknown",
    userEmail: user.email || "",
    userImage: user.image,
  };
}

// older rehearsals have their date stored as a Date rather than YYYY-MM-DD,
// so it is always turned into a string before use or before going to the browser
function rehearsalDateStr(date: unknown) {
  return date instanceof Date
    ? date.toISOString().slice(0, 10)
    : String(date).slice(0, 10);
}

// who is available for each rehearsal, and the current user's own answers.
// "base" availability is for one-off rehearsals (no occurrence date), "occ"
// is per date of a repeating one
async function loadAvailability(
  db: Db,
  user: Document,
  rehearsals: Document[],
) {
  const records =
    rehearsals.length > 0
      ? await db
          .collection("rehearsal_availability")
          .find({
            rehearsalId: { $in: rehearsals.map((r) => r._id) },
            active: { $ne: false },
            $or: [{ userId: user._id }, { available: true }],
          })
          .toArray()
      : [];

  const availableRecords = records.filter((a) => a.available === true);
  const users = await db
    .collection("users")
    .find({
      _id: {
        $in: toObjectIds([
          ...new Set(availableRecords.map((a) => a.userId.toString())),
        ]),
      },
    })
    .project({ name: 1, email: 1, image: 1 })
    .toArray();
  const userMap = new Map<string, AvailUser>(
    users.map((u) => [
      u._id.toString(),
      {
        userId: u._id.toString(),
        userName: u.name || "Unknown",
        userEmail: u.email || "",
        userImage: u.image,
      },
    ]),
  );

  const availableUsersBase: Record<string, AvailUser[]> = {};
  const availableUsersOcc: Record<string, Record<string, AvailUser[]>> = {};
  for (const a of availableRecords) {
    const info = userMap.get(a.userId.toString());
    if (!info) continue;
    const rid = a.rehearsalId.toString();
    const list = a.occurrenceDate
      ? ((availableUsersOcc[rid] ??= {})[a.occurrenceDate] ??= [])
      : (availableUsersBase[rid] ??= []);
    if (!list.some((u) => u.userId === info.userId)) list.push(info);
  }

  const myBase: Record<
    string,
    { available: boolean; alwaysAvailable: boolean }
  > = {};
  const myOcc: Record<string, Record<string, boolean>> = {};
  for (const a of records) {
    if (a.userId.toString() !== user._id.toString()) continue;
    const rid = a.rehearsalId.toString();
    if (!a.occurrenceDate) {
      myBase[rid] = {
        available: a.available ?? false,
        alwaysAvailable: a.alwaysAvailable ?? false,
      };
    } else {
      (myOcc[rid] ??= {})[a.occurrenceDate] = a.available ?? false;
    }
  }

  return { availableUsersBase, availableUsersOcc, myBase, myOcc };
}

// create rehearsal
export async function createRehearsalAction(
  bandId: string,
  date: string,
  repeatType: RehearsalRepeatType,
  startTime?: string,
  endTime?: string,
  notes?: string,
) {
  return runAction("Failed to create rehearsal", async () => {
    const fields = readRehearsalFields(
      date,
      repeatType,
      startTime,
      endTime,
      notes,
    );
    const { db, user, band, bandObjectId } =
      await requireBandMemberContext(bandId);

    const result = await db.collection("rehearsals").insertOne({
      bandId: bandObjectId,
      createdBy: user._id,
      ...fields,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const dayLabel = new Date(fields.date + "T12:00:00").toLocaleDateString(
      "en-GB",
      { weekday: "short", day: "numeric", month: "short" },
    );
    const times = formatRehearsalTimes(fields.startTime, fields.endTime);
    const repeatLabel =
      fields.repeatType === "once" ? "" : `, repeating ${fields.repeatType}`;
    notifyBandMembers(db, band, user._id.toString(), "rehearsals", {
      title: band.name,
      body: `${user.name || "Someone"} scheduled a rehearsal on ${dayLabel}${times ? ` at ${times}` : ""}${repeatLabel}`,
      url: `/bands/${bandObjectId.toString()}`,
      tag: `rehearsal-${result.insertedId.toString()}`,
    });

    // creator is auto available for the first rehearsal
    if (fields.repeatType === "once") {
      await db.collection("rehearsal_availability").insertOne({
        rehearsalId: result.insertedId,
        userId: user._id,
        available: true,
        alwaysAvailable: false,
        active: true,
      });
    } else {
      await db.collection("rehearsal_availability").insertMany([
        {
          rehearsalId: result.insertedId,
          userId: user._id,
          available: false,
          alwaysAvailable: false,
          active: true,
        },
        {
          rehearsalId: result.insertedId,
          userId: user._id,
          occurrenceDate: fields.date,
          available: true,
          active: true,
        },
      ]);
    }

    return { rehearsalId: result.insertedId.toString() };
  });
}

// get user rehearsals (all rehearsals from bands the user is a member of)
export async function getUserRehearsalsAction() {
  return runAction("Failed to fetch rehearsals", async () => {
    const { db, user } = await getAuthUser();

    // find all bands the user belongs to
    const bands = await db
      .collection("bands")
      .find({ "members.userId": user._id.toString() })
      .project({ name: 1 })
      .toArray();
    const bandNameMap = new Map(
      bands.map((b) => [b._id.toString(), b.name as string]),
    );

    const rehearsals =
      bands.length > 0
        ? await db
            .collection("rehearsals")
            .find({ bandId: { $in: bands.map((b) => b._id) } })
            .toArray()
        : [];

    const { availableUsersBase, availableUsersOcc, myBase, myOcc } =
      await loadAvailability(db, user, rehearsals);

    return {
      rehearsals: rehearsals.map((r) => {
        const rid = r._id.toString();
        return {
          ...r,
          _id: rid,
          bandId: r.bandId.toString(),
          createdBy: r.createdBy.toString(),
          date: rehearsalDateStr(r.date),
          bandName: bandNameMap.get(r.bandId.toString()) || "Unknown band",
          available: myBase[rid]?.available ?? false,
          occurrenceAvailability: myOcc[rid] ?? {},
          availableUsersBase: availableUsersBase[rid] ?? [],
          availableUsersOcc: availableUsersOcc[rid] ?? {},
        };
      }),
      currentUser: currentUserInfo(user),
    };
  });
}

// set rehearsal availability
export async function setRehearsalAvailabilityAction(
  rehearsalId: string,
  available: boolean,
  alwaysAvailable?: boolean,
  occurrenceDate?: string,
) {
  return runAction("Failed to set availability", async () => {
    const isAvailable = readBoolean(available, "availability");
    const always =
      alwaysAvailable === undefined
        ? undefined
        : readBoolean(alwaysAvailable, "availability");
    const date =
      occurrenceDate === undefined ? undefined : readDateStr(occurrenceDate);

    const { db, user, rehearsalObjectId } = await requireRehearsal(rehearsalId);
    const fields = {
      available: isAvailable,
      active: true,
      ...(always !== undefined ? { alwaysAvailable: always } : {}),
    };

    if (date) {
      await db.collection("rehearsal_availability").updateOne(
        {
          rehearsalId: rehearsalObjectId,
          userId: user._id,
          occurrenceDate: date,
        },
        { $set: { ...fields, occurrenceDate: date } },
        { upsert: true },
      );
      return;
    }

    // for base availability find and update to avoid $exists in upsert
    const existing = await db.collection("rehearsal_availability").findOne({
      rehearsalId: rehearsalObjectId,
      userId: user._id,
      occurrenceDate: { $exists: false },
    });
    if (existing) {
      await db
        .collection("rehearsal_availability")
        .updateOne({ _id: existing._id }, { $set: fields });
    } else {
      await db.collection("rehearsal_availability").insertOne({
        rehearsalId: rehearsalObjectId,
        userId: user._id,
        ...fields,
      });
    }
  });
}

// cancel a single occurrence of a recurring rehearsal (adds date to excludedDates)
export async function cancelRehearsalOccurrenceAction(
  rehearsalId: string,
  occurrenceDate: string,
) {
  return runAction("Failed to cancel rehearsal", async () => {
    const date = readDateStr(occurrenceDate);
    const { db, rehearsal, rehearsalObjectId } =
      await requireRehearsal(rehearsalId);
    if (rehearsal.repeatType === "once") {
      throw new UserError("Cannot cancel occurrence of a one-time rehearsal");
    }
    await db.collection("rehearsals").updateOne(
      { _id: rehearsalObjectId },
      {
        $addToSet: { excludedDates: date },
        $set: { updatedAt: new Date() },
      },
    );
    // clean up any occurrence availability for that date
    await db.collection("rehearsal_availability").deleteMany({
      rehearsalId: rehearsalObjectId,
      occurrenceDate: date,
    });
  });
}

// delete rehearsal
export async function deleteRehearsalAction(rehearsalId: string) {
  return runAction("Failed to delete rehearsal", async () => {
    const { db, rehearsalObjectId } = await requireRehearsal(rehearsalId);
    await deleteRehearsal(db, rehearsalObjectId);
  });
}

// end a recurring rehearsal series from a given date forward
export async function endRehearsalSeriesAction(
  rehearsalId: string,
  fromDate: string,
) {
  return runAction("Failed to end rehearsal series", async () => {
    const from = readDateStr(fromDate);
    const { db, rehearsal, rehearsalObjectId } =
      await requireRehearsal(rehearsalId);

    // if the from date is the start date, just delete the whole thing
    if (from <= rehearsalDateStr(rehearsal.date)) {
      await deleteRehearsal(db, rehearsalObjectId);
      return { deleted: true };
    }

    // set endDate to the day before fromDate
    const dayBefore = new Date(from + "T12:00:00");
    dayBefore.setDate(dayBefore.getDate() - 1);

    await db
      .collection("rehearsals")
      .updateOne(
        { _id: rehearsalObjectId },
        { $set: { endDate: toDateStr(dayBefore), updatedAt: new Date() } },
      );
    return { deleted: false };
  });
}

export async function updateRehearsalAction(
  rehearsalId: string,
  date: string,
  repeatType: RehearsalRepeatType,
  startTime?: string,
  endTime?: string,
  notes?: string,
) {
  return runAction("Failed to update rehearsal", async () => {
    const fields = readRehearsalFields(
      date,
      repeatType,
      startTime,
      endTime,
      notes,
    );
    const { db, rehearsalObjectId } = await requireRehearsal(rehearsalId);
    await db
      .collection("rehearsals")
      .updateOne(
        { _id: rehearsalObjectId },
        { $set: { ...fields, updatedAt: new Date() } },
      );
  });
}

// get band rehearsals with current users availability (for home page band cards)
export async function getBandRehearsalsWithAvailabilityAction(bandId: string) {
  return runAction("Failed to fetch band rehearsals", async () => {
    const { db, user, bandObjectId } = await requireBandMemberContext(bandId);

    const rehearsals = await db
      .collection("rehearsals")
      .find({ bandId: bandObjectId })
      .toArray();

    const { availableUsersBase, availableUsersOcc, myBase, myOcc } =
      await loadAvailability(db, user, rehearsals);

    // always available users get marked available for the next 7 days
    if (user.alwaysAvailable) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const next7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        return d;
      });

      const bulkOps: AnyBulkWriteOperation<Document>[] = [];

      for (const r of rehearsals) {
        const rid = r._id.toString();
        const rData = {
          _id: rid,
          bandId: r.bandId.toString(),
          createdBy: r.createdBy.toString(),
          date: rehearsalDateStr(r.date),
          repeatType: r.repeatType,
          excludedDates: r.excludedDates,
          endDate: r.endDate,
        };
        for (const d of next7) {
          if (!doesRehearsalOccurOnDate(rData, d)) continue;
          const dateStr = toDateStr(d);

          if (r.repeatType === "once") {
            if (myBase[rid]?.available) continue;
            bulkOps.push({
              updateOne: {
                filter: {
                  rehearsalId: r._id,
                  userId: user._id,
                  occurrenceDate: { $exists: false },
                },
                update: {
                  $set: { available: true, active: true },
                  $setOnInsert: { rehearsalId: r._id, userId: user._id },
                },
                upsert: true,
              },
            });
            myBase[rid] = {
              available: true,
              alwaysAvailable: myBase[rid]?.alwaysAvailable ?? false,
            };
          } else {
            if (myOcc[rid]?.[dateStr]) continue;
            bulkOps.push({
              updateOne: {
                filter: {
                  rehearsalId: r._id,
                  userId: user._id,
                  occurrenceDate: dateStr,
                },
                update: {
                  $set: {
                    available: true,
                    active: true,
                    occurrenceDate: dateStr,
                  },
                },
                upsert: true,
              },
            });
            (myOcc[rid] ??= {})[dateStr] = true;
          }
        }
      }

      if (bulkOps.length > 0) {
        await db.collection("rehearsal_availability").bulkWrite(bulkOps);
      }
    }

    return {
      rehearsals: rehearsals.map((r) => {
        const rid = r._id.toString();
        return {
          _id: rid,
          bandId: r.bandId.toString(),
          createdBy: r.createdBy.toString(),
          date: rehearsalDateStr(r.date),
          startTime: r.startTime,
          endTime: r.endTime,
          repeatType: r.repeatType,
          notes: r.notes,
          excludedDates: r.excludedDates ?? [],
          endDate: r.endDate,
          myAvailability: myBase[rid] || {
            available: false,
            alwaysAvailable: false,
          },
          occurrenceAvailability: myOcc[rid] ?? {},
          availableUsersBase: availableUsersBase[rid] ?? [],
          availableUsersOcc: availableUsersOcc[rid] ?? {},
        };
      }),
      currentUser: currentUserInfo(user),
    };
  });
}

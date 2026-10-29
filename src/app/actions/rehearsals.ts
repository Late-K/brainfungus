"use server";

import { getAuthUser } from "@/app/lib/server/auth";
import { Db, Document, ObjectId } from "mongodb";
import {
  formatRehearsalTimes,
  rehearsalDateStr,
  toDateStr,
} from "@/app/lib/rehearsalUtils";
import { loadDayAvailability } from "@/app/lib/server/dayAvailability";
import { notifyBandMembers } from "@/app/lib/server/push";
import {
  requireBandMember,
  requireBandMemberContext,
  toObjectId,
  toObjectIds,
} from "@/app/lib/server/utils";
import { BandDocument, canEditBandItem } from "@/app/lib/server/bands";
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

// loads a rehearsal and checks the current user is in its band. changing or
// cancelling it (manage) is only for whoever scheduled it and band admins
async function requireRehearsal(
  rehearsalId: unknown,
  { manage = false } = {},
) {
  const rehearsalObjectId = toObjectId(rehearsalId, "rehearsal ID");
  const { db, user } = await getAuthUser();

  const rehearsal = await db
    .collection("rehearsals")
    .findOne({ _id: rehearsalObjectId });
  if (!rehearsal) {
    throw new UserError("Rehearsal not found");
  }

  const userId = user._id.toString();
  const { band } = await requireBandMember(db, userId, rehearsal.bandId);
  if (
    manage &&
    !canEditBandItem(band as BandDocument, userId, rehearsal.createdBy)
  ) {
    throw new UserError(
      "Only the person who scheduled this rehearsal or a band admin can change it",
    );
  }
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

// who said they're available or unavailable for each rehearsal, and the
// current user's own answers. "base" availability is for one-off rehearsals
// (no occurrence date), "occ" is per date of a repeating one. the unavailable
// answers matter because they override being free that day
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

  const unavailableBase: Record<string, string[]> = {};
  const unavailableOcc: Record<string, Record<string, string[]>> = {};
  for (const a of records) {
    if (a.available === true) continue;
    const rid = a.rehearsalId.toString();
    const list = a.occurrenceDate
      ? ((unavailableOcc[rid] ??= {})[a.occurrenceDate] ??= [])
      : (unavailableBase[rid] ??= []);
    list.push(a.userId.toString());
  }

  const myBase: Record<string, boolean> = {};
  const myOcc: Record<string, Record<string, boolean>> = {};
  for (const a of records) {
    if (a.userId.toString() !== user._id.toString()) continue;
    const rid = a.rehearsalId.toString();
    if (!a.occurrenceDate) {
      myBase[rid] = a.available ?? false;
    } else {
      (myOcc[rid] ??= {})[a.occurrenceDate] = a.available ?? false;
    }
  }

  return {
    availableUsersBase,
    availableUsersOcc,
    unavailableBase,
    unavailableOcc,
    myBase,
    myOcc,
  };
}

// everyone's answers for a rehearsal, in the shape the browser uses
function rehearsalAvailabilityFields(
  rid: string,
  availability: Awaited<ReturnType<typeof loadAvailability>>,
) {
  return {
    available: availability.myBase[rid],
    occurrenceAvailability: availability.myOcc[rid] ?? {},
    availableUsersBase: availability.availableUsersBase[rid] ?? [],
    availableUsersOcc: availability.availableUsersOcc[rid] ?? {},
    unavailableUserIdsBase: availability.unavailableBase[rid] ?? [],
    unavailableUserIdsOcc: availability.unavailableOcc[rid] ?? {},
  };
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
        active: true,
      });
    } else {
      await db.collection("rehearsal_availability").insertMany([
        {
          rehearsalId: result.insertedId,
          userId: user._id,
          available: false,
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
      .project({ name: 1, members: 1 })
      .toArray();
    const bandMap = new Map(bands.map((b) => [b._id.toString(), b]));
    const userId = user._id.toString();

    const rehearsals =
      bands.length > 0
        ? await db
            .collection("rehearsals")
            .find({ bandId: { $in: bands.map((b) => b._id) } })
            .toArray()
        : [];

    const availability = await loadAvailability(db, user, rehearsals);
    const dayAvailability = await loadDayAvailability(db, user, bands);

    return {
      rehearsals: rehearsals.map((r) => {
        const rid = r._id.toString();
        const band = bandMap.get(r.bandId.toString());
        return {
          ...r,
          _id: rid,
          bandId: r.bandId.toString(),
          createdBy: r.createdBy.toString(),
          date: rehearsalDateStr(r.date),
          bandName: (band?.name as string | undefined) || "Unknown band",
          canManage:
            !!band &&
            canEditBandItem(band as BandDocument, userId, r.createdBy),
          ...rehearsalAvailabilityFields(rid, availability),
        };
      }),
      bands: bands.map((b) => ({
        _id: b._id.toString(),
        name: b.name as string,
      })),
      dayAvailability,
      currentUser: currentUserInfo(user),
    };
  });
}

// set rehearsal availability
export async function setRehearsalAvailabilityAction(
  rehearsalId: string,
  available: boolean,
  occurrenceDate?: string,
) {
  return runAction("Failed to set availability", async () => {
    const isAvailable = readBoolean(available, "availability");
    const date =
      occurrenceDate === undefined ? undefined : readDateStr(occurrenceDate);

    const { db, user, rehearsalObjectId } = await requireRehearsal(rehearsalId);
    const fields = { available: isAvailable, active: true };

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
      await requireRehearsal(rehearsalId, { manage: true });
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
    const { db, rehearsalObjectId } = await requireRehearsal(rehearsalId, {
      manage: true,
    });
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
      await requireRehearsal(rehearsalId, { manage: true });

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
    const { db, rehearsalObjectId } = await requireRehearsal(rehearsalId, {
      manage: true,
    });
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
    const { db, user, band, bandObjectId } =
      await requireBandMemberContext(bandId);

    const rehearsals = await db
      .collection("rehearsals")
      .find({ bandId: bandObjectId })
      .toArray();

    const availability = await loadAvailability(db, user, rehearsals);
    const dayAvailability = await loadDayAvailability(db, user, [band]);

    return {
      rehearsals: rehearsals.map((r) => {
        const rid = r._id.toString();
        return {
          _id: rid,
          bandId: r.bandId.toString(),
          bandName: (band.name as string) || "Unknown band",
          createdBy: r.createdBy.toString(),
          date: rehearsalDateStr(r.date),
          startTime: r.startTime,
          endTime: r.endTime,
          repeatType: r.repeatType,
          notes: r.notes,
          excludedDates: r.excludedDates ?? [],
          endDate: r.endDate,
          canManage: canEditBandItem(
            band as BandDocument,
            user._id.toString(),
            r.createdBy,
          ),
          ...rehearsalAvailabilityFields(rid, availability),
        };
      }),
      dayAvailability,
      currentUser: currentUserInfo(user),
    };
  });
}

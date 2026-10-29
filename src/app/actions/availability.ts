"use server";

import { AnyBulkWriteOperation, Db, Document, ObjectId } from "mongodb";
import { getAuthUser } from "@/app/lib/server/auth";
import {
  DAY_AVAILABILITY,
  toDayAvailability,
} from "@/app/lib/server/dayAvailability";
import { requireBandMember } from "@/app/lib/server/utils";
import {
  addDaysToDateStr,
  doesRehearsalOccurOnDate,
} from "@/app/lib/rehearsalUtils";
import { runAction } from "@/app/lib/actionResult";
import { readDateStr, readOneOf } from "@/app/lib/validate";
import { DayAvailabilityRemoveScope, RehearsalRepeatType } from "@/app/types";

const REPEAT_TYPES: RehearsalRepeatType[] = ["once", "weekly", "biweekly"];
const REMOVE_SCOPES: DayAvailabilityRemoveScope[] = ["this", "future"];

// the current user's schedules for a band that include the date
async function findCoveringSchedules(
  db: Db,
  userId: ObjectId,
  bandObjectId: ObjectId,
  date: string,
) {
  const schedules = await db
    .collection(DAY_AVAILABILITY)
    .find({ userId, bandId: bandObjectId })
    .toArray();
  const day = new Date(date + "T12:00:00");
  return schedules.filter((s) =>
    doesRehearsalOccurOnDate(toDayAvailability(s), day),
  );
}

// mark the current user free on a day for one of their bands, once or
// repeating from it
export async function addDayAvailabilityAction(
  date: string,
  repeatType: RehearsalRepeatType,
  bandId: string,
) {
  return runAction("Failed to set availability", async () => {
    const day = readDateStr(date);
    const repeat = readOneOf(repeatType, REPEAT_TYPES, "repeat");
    const { db, user } = await getAuthUser();
    const { bandObjectId } = await requireBandMember(
      db,
      user._id.toString(),
      bandId,
    );
    const covering = await findCoveringSchedules(
      db,
      user._id,
      bandObjectId,
      day,
    );

    // already free that day for this band, nothing to add
    if (repeat === "once" && covering.length > 0) return;

    // a repeating one starting today makes a one-off on the same day redundant
    const redundant = covering.filter((s) => s.repeatType === "once");
    if (redundant.length > 0) {
      await db
        .collection(DAY_AVAILABILITY)
        .deleteMany({ _id: { $in: redundant.map((s) => s._id) } });
    }

    await db.collection(DAY_AVAILABILITY).insertOne({
      userId: user._id,
      bandId: bandObjectId,
      date: day,
      repeatType: repeat,
      excludedDates: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });
}

// stop being free on a day for a band. repeating availability either skips
// just that day, or ends from it onwards
export async function removeDayAvailabilityAction(
  date: string,
  scope: DayAvailabilityRemoveScope,
  bandId: string,
) {
  return runAction("Failed to remove availability", async () => {
    const day = readDateStr(date);
    const removeScope = readOneOf(scope, REMOVE_SCOPES, "scope");
    const { db, user } = await getAuthUser();
    const { bandObjectId } = await requireBandMember(
      db,
      user._id.toString(),
      bandId,
    );
    const covering = await findCoveringSchedules(
      db,
      user._id,
      bandObjectId,
      day,
    );

    const ops: AnyBulkWriteOperation<Document>[] = covering.map((s) => {
      if (
        s.repeatType === "once" ||
        (removeScope === "future" && day <= s.date)
      ) {
        return { deleteOne: { filter: { _id: s._id } } };
      }
      return {
        updateOne: {
          filter: { _id: s._id },
          update:
            removeScope === "this"
              ? {
                  $addToSet: { excludedDates: day },
                  $set: { updatedAt: new Date() },
                }
              : {
                  $set: {
                    endDate: addDaysToDateStr(day, -1),
                    updatedAt: new Date(),
                  },
                },
        },
      };
    });

    if (ops.length > 0) {
      await db.collection(DAY_AVAILABILITY).bulkWrite(ops);
    }
  });
}

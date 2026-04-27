"use server";

import { getAuthUser } from "@/app/lib/auth";
import { AnyBulkWriteOperation, Db, Document, ObjectId } from "mongodb";
import { doesRehearsalOccurOnDate, toDateStr } from "@/app/lib/rehearsalUtils";
import { AvailUser } from "@/app/types";

// verify rehearsal exists and user is a band member
async function getAuthorizedRehearsal(
  db: Db,
  rehearsalId: string,
  userId: string,
) {
  if (!ObjectId.isValid(rehearsalId)) {
    throw new Error("Invalid rehearsal ID");
  }
  const rehearsal = await db
    .collection("rehearsals")
    .findOne({ _id: new ObjectId(rehearsalId) });
  if (!rehearsal) {
    throw new Error("Rehearsal not found");
  }
  const band = await db.collection("bands").findOne({ _id: rehearsal.bandId });
  if (!band) {
    throw new Error("Band not found");
  }
  if (
    !(band.members as Array<{ userId: string }>)?.some(
      (m) => m.userId === userId,
    )
  ) {
    throw new Error("Not a band member");
  }
  return rehearsal;
}

type AvailabilityRecord = {
  rehearsalId: { toString(): string };
  userId: { toString(): string };
  occurrenceDate?: string;
};

function buildAvailableUsersMaps(
  allAvailabilities: Document[],
  userMap: Record<
    string,
    { userName: string; userEmail: string; userImage?: string }
  >,
): {
  availableUsersBase: Record<string, AvailUser[]>;
  availableUsersOcc: Record<string, Record<string, AvailUser[]>>;
} {
  const availableUsersBase: Record<string, AvailUser[]> = {};
  const availableUsersOcc: Record<string, Record<string, AvailUser[]>> = {};

  for (const a of allAvailabilities) {
    const record = a as Document & AvailabilityRecord;
    const rid = record.rehearsalId.toString();
    const uid = record.userId.toString();
    if (!userMap[uid]) continue;
    const info = { userId: uid, ...userMap[uid] };
    if (!record.occurrenceDate) {
      if (!availableUsersBase[rid]) availableUsersBase[rid] = [];
      if (!availableUsersBase[rid].some((u) => u.userId === uid)) {
        availableUsersBase[rid].push(info);
      }
    } else {
      if (!availableUsersOcc[rid]) availableUsersOcc[rid] = {};
      if (!availableUsersOcc[rid][record.occurrenceDate]) {
        availableUsersOcc[rid][record.occurrenceDate] = [];
      }
      if (
        !availableUsersOcc[rid][record.occurrenceDate].some(
          (u) => u.userId === uid,
        )
      ) {
        availableUsersOcc[rid][record.occurrenceDate].push(info);
      }
    }
  }

  return { availableUsersBase, availableUsersOcc };
}

// create rehearsal
export async function createRehearsalAction(
  bandId: string,
  date: string,
  repeatType: "once" | "weekly" | "biweekly",
  startTime?: string,
  endTime?: string,
  notes?: string,
) {
  try {
    const { db, user } = await getAuthUser();

    if (!ObjectId.isValid(bandId)) {
      throw new Error("Invalid band ID");
    }

    const band = await db
      .collection("bands")
      .findOne({ _id: new ObjectId(bandId) });
    if (!band) {
      throw new Error("Band not found");
    }
    if (
      !(band.members as Array<{ userId: string }>)?.some(
        (m) => m.userId === user._id.toString(),
      )
    ) {
      throw new Error("Not a member of this band");
    }

    const newRehearsal = {
      bandId: new ObjectId(bandId),
      createdBy: user._id,
      date,
      startTime,
      endTime,
      repeatType,
      notes: notes || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.collection("rehearsals").insertOne(newRehearsal);

    //creator is auto available for the first rehearsal
    if (repeatType === "once") {
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
          occurrenceDate: date,
          available: true,
          active: true,
        },
      ]);
    }

    return {
      success: true,
      rehearsalId: result.insertedId.toString(),
      message: "Rehearsal created successfully",
    };
  } catch (error) {
    console.error("Error creating rehearsal:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to create rehearsal");
  }
}

//get user rehearsals (all rehearsals from bands the user is a member of)
export async function getUserRehearsalsAction() {
  try {
    const { db, user } = await getAuthUser();
    const userId = user._id.toString();

    // find all bands the user belongs to
    const bands = await db
      .collection("bands")
      .find({ "members.userId": userId })
      .project({ name: 1 })
      .toArray();

    if (bands.length === 0) {
      return {
        success: true,
        rehearsals: [],
        currentUser: {
          userId: userId,
          userName: user.name || "Unknown",
          userEmail: user.email || "",
          userImage: user.image,
        },
      };
    }

    const bandIds = bands.map((b) => b._id);
    const bandNameMap: Record<string, string> = {};
    for (const b of bands) {
      bandNameMap[b._id.toString()] = b.name;
    }

    // fetch all rehearsals from those bands
    const rehearsals = await db
      .collection("rehearsals")
      .find({ bandId: { $in: bandIds } })
      .toArray();

    if (rehearsals.length === 0) {
      return {
        success: true,
        rehearsals: [],
        currentUser: {
          userId: userId,
          userName: user.name || "Unknown",
          userEmail: user.email || "",
          userImage: user.image,
        },
      };
    }

    // fetch all relevant availability records
    const rehearsalIds = rehearsals.map((r) => r._id);
    const allRecords = await db
      .collection("rehearsal_availability")
      .find({
        rehearsalId: { $in: rehearsalIds },
        active: { $ne: false },
        $or: [{ userId: user._id }, { available: true }],
      })
      .toArray();

    const availabilities = allRecords.filter(
      (a) => a.userId.toString() === user._id.toString(),
    );
    const allAvailabilities = allRecords.filter((a) => a.available === true);

    // look up user info for all available users
    const allUserIds = [
      ...new Set(allAvailabilities.map((a) => a.userId.toString())),
    ];
    const users = await db
      .collection("users")
      .find({ _id: { $in: allUserIds.map((id) => new ObjectId(id)) } })
      .project({ name: 1, email: 1, image: 1 })
      .toArray();
    const userMap: Record<
      string,
      { userName: string; userEmail: string; userImage?: string }
    > = {};
    for (const u of users) {
      userMap[u._id.toString()] = {
        userName: u.name || "Unknown",
        userEmail: u.email || "",
        userImage: u.image,
      };
    }

    // build per-rehearsal available users maps
    // for one-time/base availability vs occurrence-specific availability
    const { availableUsersBase, availableUsersOcc } = buildAvailableUsersMaps(
      allAvailabilities,
      userMap,
    );

    const availMap: Record<string, boolean> = {};
    const occurrenceAvailMap: Record<string, Record<string, boolean>> = {};
    for (const a of availabilities) {
      const rid = a.rehearsalId.toString();
      if (!a.occurrenceDate) {
        availMap[rid] = a.available ?? false;
      } else {
        if (!occurrenceAvailMap[rid]) occurrenceAvailMap[rid] = {};
        occurrenceAvailMap[rid][a.occurrenceDate] = a.available ?? false;
      }
    }

    return {
      success: true,
      rehearsals: rehearsals.map((r) => ({
        ...r,
        _id: r._id.toString(),
        bandId: r.bandId.toString(),
        createdBy: r.createdBy.toString(),
        bandName: bandNameMap[r.bandId.toString()] || "Unknown band",
        available: availMap[r._id.toString()] ?? false,
        occurrenceAvailability: occurrenceAvailMap[r._id.toString()] ?? {},
        availableUsersBase: availableUsersBase[r._id.toString()] ?? [],
        availableUsersOcc: availableUsersOcc[r._id.toString()] ?? {},
      })),
      currentUser: {
        userId: userId,
        userName: user.name || "Unknown",
        userEmail: user.email || "",
        userImage: user.image,
      },
    };
  } catch (error) {
    console.error("Error fetching user rehearsals:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to fetch user rehearsals");
  }
}

//set rehearsal availability
export async function setRehearsalAvailabilityAction(
  rehearsalId: string,
  available: boolean,
  alwaysAvailable?: boolean,
  occurrenceDate?: string,
) {
  try {
    const { db, user } = await getAuthUser();
    if (!ObjectId.isValid(rehearsalId)) {
      throw new Error("Invalid rehearsal ID");
    }

    // verify rehearsal exists + user is band member
    const authorized = await db
      .collection("rehearsals")
      .aggregate([
        { $match: { _id: new ObjectId(rehearsalId) } },
        {
          $lookup: {
            from: "bands",
            localField: "bandId",
            foreignField: "_id",
            as: "band",
          },
        },
        { $unwind: "$band" },
        { $match: { "band.members.userId": user._id.toString() } },
        { $project: { _id: 1 } },
      ])
      .toArray();
    if (authorized.length === 0) throw new Error("Not authorized");

    if (occurrenceDate) {
      await db.collection("rehearsal_availability").updateOne(
        {
          rehearsalId: new ObjectId(rehearsalId),
          userId: user._id,
          occurrenceDate,
        },
        {
          $set: {
            available,
            active: true,
            ...(alwaysAvailable !== undefined ? { alwaysAvailable } : {}),
            occurrenceDate,
          },
        },
        { upsert: true },
      );
    } else {
      // for base availability find and update to avoid $exists in upsert
      const existing = await db.collection("rehearsal_availability").findOne({
        rehearsalId: new ObjectId(rehearsalId),
        userId: user._id,
        occurrenceDate: { $exists: false },
      });
      if (existing) {
        await db.collection("rehearsal_availability").updateOne(
          { _id: existing._id },
          {
            $set: {
              available,
              active: true,
              ...(alwaysAvailable !== undefined ? { alwaysAvailable } : {}),
            },
          },
        );
      } else {
        await db.collection("rehearsal_availability").insertOne({
          rehearsalId: new ObjectId(rehearsalId),
          userId: user._id,
          available,
          active: true,
          ...(alwaysAvailable !== undefined ? { alwaysAvailable } : {}),
        });
      }
    }

    return { success: true, message: "Rehearsal availability updated" };
  } catch (error) {
    console.error("Error setting rehearsal availability:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to set rehearsal availability");
  }
}

// cancel a single occurrence of a recurring rehearsal (adds date to excludedDates)
export async function cancelRehearsalOccurrenceAction(
  rehearsalId: string,
  occurrenceDate: string,
) {
  try {
    const { db, user } = await getAuthUser();
    const rehearsal = await getAuthorizedRehearsal(
      db,
      rehearsalId,
      user._id.toString(),
    );
    if (rehearsal.repeatType === "once") {
      throw new Error("Cannot cancel occurrence of a one-time rehearsal");
    }
    await db.collection("rehearsals").updateOne(
      { _id: new ObjectId(rehearsalId) },
      {
        $addToSet: { excludedDates: occurrenceDate },
        $set: { updatedAt: new Date() },
      },
    );
    // clean up any occurrence-specific availability for that date
    await db.collection("rehearsal_availability").deleteMany({
      rehearsalId: new ObjectId(rehearsalId),
      occurrenceDate,
    });
    return { success: true, message: "Occurrence cancelled" };
  } catch (error) {
    console.error("Error cancelling rehearsal occurrence:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to cancel rehearsal occurrence");
  }
}

//delete rehearsal
export async function deleteRehearsalAction(rehearsalId: string) {
  try {
    const { db, user } = await getAuthUser();
    await getAuthorizedRehearsal(db, rehearsalId, user._id.toString());
    await db
      .collection("rehearsals")
      .deleteOne({ _id: new ObjectId(rehearsalId) });
    await db
      .collection("rehearsal_availability")
      .deleteMany({ rehearsalId: new ObjectId(rehearsalId) });
    return { success: true, message: "Rehearsal deleted" };
  } catch (error) {
    console.error("Error deleting rehearsal:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to delete rehearsal");
  }
}

// end a recurring rehearsal series from a given date forward
export async function endRehearsalSeriesAction(
  rehearsalId: string,
  fromDate: string,
) {
  try {
    const { db, user } = await getAuthUser();
    const rehearsal = await getAuthorizedRehearsal(
      db,
      rehearsalId,
      user._id.toString(),
    );

    // if the from date is the start date, just delete the whole thing
    const startStr =
      rehearsal.date instanceof Date
        ? rehearsal.date.toISOString().slice(0, 10)
        : String(rehearsal.date).slice(0, 10);
    if (fromDate <= startStr) {
      await db
        .collection("rehearsals")
        .deleteOne({ _id: new ObjectId(rehearsalId) });
      await db
        .collection("rehearsal_availability")
        .deleteMany({ rehearsalId: new ObjectId(rehearsalId) });
      return { success: true, message: "Rehearsal series deleted" };
    }

    // set endDate to the day before fromDate
    const from = new Date(fromDate + "T12:00:00");
    from.setDate(from.getDate() - 1);
    const endDate = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-${String(from.getDate()).padStart(2, "0")}`;

    await db
      .collection("rehearsals")
      .updateOne(
        { _id: new ObjectId(rehearsalId) },
        { $set: { endDate, updatedAt: new Date() } },
      );
    return { success: true, message: "Rehearsal series ended" };
  } catch (error) {
    console.error("Error ending rehearsal series:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to end rehearsal series");
  }
}

export async function updateRehearsalAction(
  rehearsalId: string,
  date: string,
  repeatType: "once" | "weekly" | "biweekly",
  startTime?: string,
  endTime?: string,
  notes?: string,
) {
  try {
    const { db, user } = await getAuthUser();
    await getAuthorizedRehearsal(db, rehearsalId, user._id.toString());
    await db.collection("rehearsals").updateOne(
      { _id: new ObjectId(rehearsalId) },
      {
        $set: {
          date,
          repeatType,
          startTime,
          endTime,
          notes: notes || "",
          updatedAt: new Date(),
        },
      },
    );
    return { success: true, message: "Rehearsal updated" };
  } catch (error) {
    console.error("Error updating rehearsal:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to update rehearsal");
  }
}

// get band rehearsals with current user's availability (for home page band cards)
export async function getBandRehearsalsWithAvailabilityAction(bandId: string) {
  try {
    const { db, user } = await getAuthUser();
    if (!ObjectId.isValid(bandId)) {
      throw new Error("Invalid band ID");
    }
    const band = await db
      .collection("bands")
      .findOne({ _id: new ObjectId(bandId) });
    if (!band) {
      throw new Error("Band not found");
    }
    if (
      !(band.members as Array<{ userId: string }>)?.some(
        (m) => m.userId === user._id.toString(),
      )
    ) {
      throw new Error("Not a band member");
    }

    const rehearsals = await db
      .collection("rehearsals")
      .find({ bandId: new ObjectId(bandId) })
      .toArray();

    // fetch all relevant availability records in one query
    const rehearsalIds = rehearsals.map((r) => r._id);
    const allRecords = await db
      .collection("rehearsal_availability")
      .find({
        rehearsalId: { $in: rehearsalIds },
        active: { $ne: false },
        $or: [{ userId: user._id }, { available: true }],
      })
      .toArray();

    const availabilities = allRecords.filter(
      (a) => a.userId.toString() === user._id.toString(),
    );
    const allAvailabilities = allRecords.filter((a) => a.available === true);

    // look up user info
    const allUserIds = [
      ...new Set(allAvailabilities.map((a) => a.userId.toString())),
    ];
    const usersArr =
      allUserIds.length > 0
        ? await db
            .collection("users")
            .find({ _id: { $in: allUserIds.map((id) => new ObjectId(id)) } })
            .project({ name: 1, email: 1, image: 1 })
            .toArray()
        : [];
    const userInfoMap: Record<
      string,
      { userName: string; userEmail: string; userImage?: string }
    > = {};
    for (const u of usersArr) {
      userInfoMap[u._id.toString()] = {
        userName: u.name || "Unknown",
        userEmail: u.email || "",
        userImage: u.image,
      };
    }

    // build per-rehearsal available users
    const { availableUsersBase, availableUsersOcc } = buildAvailableUsersMaps(
      allAvailabilities,
      userInfoMap,
    );

    const availMap: Record<
      string,
      { available: boolean; alwaysAvailable: boolean }
    > = {};
    const occAvailMap: Record<string, Record<string, boolean>> = {};
    for (const a of availabilities) {
      const rid = a.rehearsalId.toString();
      if (!a.occurrenceDate) {
        availMap[rid] = {
          available: a.available ?? false,
          alwaysAvailable: a.alwaysAvailable ?? false,
        };
      } else {
        if (!occAvailMap[rid]) occAvailMap[rid] = {};
        occAvailMap[rid][a.occurrenceDate] = a.available ?? false;
      }
    }

    // auto-mark occurrence records for the next 7 days
    const userAlwaysAvailable = user.alwaysAvailable ?? false;
    if (userAlwaysAvailable) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const next7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        return d;
      });

      // collect bulk operations instead of writing one-by-one
      const bulkOps: AnyBulkWriteOperation<Document>[] = [];

      for (const r of rehearsals) {
        for (const d of next7) {
          const rData = {
            _id: r._id.toString(),
            bandId: r.bandId.toString(),
            createdBy: r.createdBy.toString(),
            date: r.date,
            repeatType: r.repeatType,
            excludedDates: r.excludedDates,
            endDate: r.endDate,
          };
          if (doesRehearsalOccurOnDate(rData, d)) {
            const dateStr = toDateStr(d);
            const rid = r._id.toString();
            if (r.repeatType === "once") {
              if (!availMap[rid]?.available) {
                bulkOps.push({
                  updateOne: {
                    filter: {
                      rehearsalId: r._id,
                      userId: user._id,
                      occurrenceDate: { $exists: false },
                    },
                    update: {
                      $set: { available: true, active: true },
                      $setOnInsert: {
                        rehearsalId: r._id,
                        userId: user._id,
                      },
                    },
                    upsert: true,
                  },
                });
                availMap[rid] = {
                  available: true,
                  alwaysAvailable: availMap[rid]?.alwaysAvailable ?? false,
                };
              }
            } else {
              if (!occAvailMap[rid]?.[dateStr]) {
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
                if (!occAvailMap[rid]) occAvailMap[rid] = {};
                occAvailMap[rid][dateStr] = true;
              }
            }
          }
        }
      }

      if (bulkOps.length > 0) {
        await db.collection("rehearsal_availability").bulkWrite(bulkOps);
      }
    }

    const result = rehearsals.map((r) => ({
      _id: r._id.toString(),
      bandId: r.bandId.toString(),
      createdBy: r.createdBy.toString(),
      date: r.date,
      startTime: r.startTime,
      endTime: r.endTime,
      repeatType: r.repeatType,
      notes: r.notes,
      excludedDates: r.excludedDates ?? [],
      endDate: r.endDate,
      myAvailability: availMap[r._id.toString()] || {
        available: false,
        alwaysAvailable: false,
      },
      occurrenceAvailability: occAvailMap[r._id.toString()] ?? {},
      availableUsersBase: availableUsersBase[r._id.toString()] ?? [],
      availableUsersOcc: availableUsersOcc[r._id.toString()] ?? {},
    }));

    return {
      success: true,
      rehearsals: result,
      currentUser: {
        userId: user._id.toString(),
        userName: user.name || "Unknown",
        userEmail: user.email || "",
        userImage: user.image,
      },
    };
  } catch (error) {
    console.error("Error fetching band rehearsals with availability:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to fetch band rehearsals");
  }
}

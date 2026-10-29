import "server-only";

// the days users have said they're free, shown to their bandmates and used to
// auto mark them available for rehearsals on those days

import { Db, Document } from "mongodb";
import { toObjectIds } from "@/app/lib/server/utils";
import {
  DayAvailability,
  DayAvailabilityInfo,
  DayAvailabilityUser,
} from "@/app/types";

export const DAY_AVAILABILITY = "day_availability";

export function toDayAvailability(doc: Document): DayAvailability {
  return {
    _id: doc._id.toString(),
    bandId: doc.bandId.toString(),
    date: doc.date,
    repeatType: doc.repeatType,
    excludedDates: doc.excludedDates ?? [],
    endDate: doc.endDate,
  };
}

// the current user's day availability and their bandmates', for the given
// bands (which need their members). bandmates who've made theirs private are
// left out entirely, the current user is always included so they see their
// own days
export async function loadDayAvailability(
  db: Db,
  user: Document,
  bands: Document[],
): Promise<DayAvailabilityInfo> {
  const myId = user._id.toString();
  const bandMemberIds: Record<string, string[]> = {};
  for (const band of bands) {
    bandMemberIds[band._id.toString()] = (
      (band.members as Array<{ userId: string }>) ?? []
    ).map((m) => m.userId);
  }

  const otherIds = [...new Set(Object.values(bandMemberIds).flat())].filter(
    (id) => id !== myId,
  );
  const others = await db
    .collection("users")
    .find({
      _id: { $in: toObjectIds(otherIds) },
      availabilityPrivate: { $ne: true },
    })
    .project({ name: 1, email: 1, image: 1 })
    .toArray();
  const people = [user, ...others];

  const schedules = await db
    .collection(DAY_AVAILABILITY)
    .find({
      userId: { $in: people.map((p) => p._id) },
      bandId: { $in: bands.map((b) => b._id) },
    })
    .toArray();
  const byUser = new Map<string, DayAvailability[]>();
  for (const s of schedules) {
    const id = s.userId.toString();
    byUser.set(id, [...(byUser.get(id) ?? []), toDayAvailability(s)]);
  }

  const users: DayAvailabilityUser[] = people
    .map((p) => ({
      userId: p._id.toString(),
      userName: p.name || "Unknown",
      userEmail: p.email || "",
      userImage: p.image,
      schedules: byUser.get(p._id.toString()) ?? [],
      ...(p._id.toString() === myId && user.availabilityPrivate === true
        ? { paused: true }
        : {}),
    }))
    .filter((u) => u.userId === myId || u.schedules.length > 0);

  return { users, bandMemberIds };
}

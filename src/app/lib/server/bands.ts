import "server-only";

// band and invite helpers shared by the band and invite actions

import { BulkWriteResult, Db, MongoBulkWriteError, ObjectId } from "mongodb";
import { getAuthUser } from "@/app/lib/server/auth";
import { notifyUsers } from "@/app/lib/server/push";
import { isBandMember, toObjectId } from "@/app/lib/server/utils";
import { UserError } from "@/app/lib/actionResult";
import { BandRole } from "@/app/types";

type BandMemberEntry = { userId: string; role: BandRole };

export type BandDocument = {
  _id?: ObjectId;
  name: string;
  description: string;
  members: BandMemberEntry[];
  createdAt: Date;
  image?: string;
  imageBlobUrl?: string;
  imageMimeType?: string;
  customSongsPrivate?: boolean;
};

// a pending invite - deleted once it's accepted, declined or cancelled
type BandInviteDocument = {
  _id?: ObjectId;
  bandId: ObjectId;
  userId: ObjectId;
  invitedBy: ObjectId;
  createdAt: Date;
};

export function getBandsCollection(db: Db) {
  return db.collection<BandDocument>("bands");
}

export function getInvitesCollection(db: Db) {
  return db.collection<BandInviteDocument>("band_invites");
}

// one invite per person per band, enforced by the database so two invites
// sent at the same moment can't both be saved. userId first so it also speeds
// up loading someone's own invites. createIndex does nothing if the index
// already exists, so this only does real work once per server start
let inviteIndex: Promise<unknown> | undefined;
function ensureInviteIndex(db: Db) {
  inviteIndex ??= getInvitesCollection(db)
    .createIndex({ userId: 1, bandId: 1 }, { unique: true })
    .catch((error) => {
      // e.g. duplicates saved before the index existed - invites still work
      console.error("Failed to create band invite index:", error);
      inviteIndex = undefined;
    });
  return inviteIndex;
}

const DUPLICATE_KEY = 11000;

export function isAdminOrCreator(band: BandDocument, userId: string) {
  return band.members.some(
    (m) => m.userId === userId && (m.role === "admin" || m.role === "creator"),
  );
}

export function isBandCreator(band: BandDocument, userId: string) {
  return band.members.some((m) => m.userId === userId && m.role === "creator");
}

// admins can manage plain members, but only the creator can remove or demote
// another admin
export function requireCanManageMember(
  band: BandDocument,
  memberId: string,
  isCreator: boolean,
) {
  const entry = band.members.find((m) => m.userId === memberId);
  if (!entry) throw new UserError("User is not a band member");
  if (entry.role === "creator") {
    throw new UserError("Cannot change the band creator");
  }
  if (entry.role === "admin" && !isCreator) {
    throw new UserError("Only the band creator can change other admins");
  }
  return entry;
}

// whether a user can change or delete something in a band - whoever made it,
// or any of the band's admins
export function canEditBandItem(
  band: BandDocument,
  userId: string,
  createdBy: unknown,
) {
  return (
    (createdBy != null && String(createdBy) === userId) ||
    isAdminOrCreator(band, userId)
  );
}

export function readUserId(value: unknown) {
  return toObjectId(value, "user ID").toString();
}

export async function setMemberBandDataActiveState(
  db: Db,
  bandObjectId: ObjectId,
  memberId: string,
  active: boolean,
) {
  const rehearsalIds = (
    await db
      .collection("rehearsals")
      .find({ bandId: bandObjectId })
      .project({ _id: 1 })
      .toArray()
  ).map((r) => r._id);

  if (rehearsalIds.length === 0) return;

  await db
    .collection("rehearsal_availability")
    .updateMany(
      { rehearsalId: { $in: rehearsalIds }, userId: new ObjectId(memberId) },
      { $set: { active, updatedAt: new Date() } },
    );
}

// invite users to a band, skipping anyone already in it. inviting someone who
// already has an invite keeps the original one, and only people with a new
// invite get notified
export async function sendBandInvites(
  db: Db,
  bandObjectId: ObjectId,
  band: BandDocument,
  inviter: { _id: ObjectId; name?: string },
  userIds: ObjectId[],
) {
  const toInvite = userIds.filter((id) => !isBandMember(band, id.toString()));
  if (toInvite.length === 0) return;

  await ensureInviteIndex(db);
  let result: BulkWriteResult;
  try {
    result = await getInvitesCollection(db).bulkWrite(
      toInvite.map((userId) => ({
        updateOne: {
          filter: { bandId: bandObjectId, userId },
          update: {
            $setOnInsert: {
              bandId: bandObjectId,
              userId,
              invitedBy: inviter._id,
              createdAt: new Date(),
            },
          },
          upsert: true,
        },
      })),
      // keep going past an invite that already exists
      { ordered: false },
    );
  } catch (error) {
    // a duplicate means someone else invited that person at the same moment,
    // which is fine - they still have exactly one invite
    const writeErrors =
      error instanceof MongoBulkWriteError ? [error.writeErrors].flat() : [];
    if (
      writeErrors.length === 0 ||
      writeErrors.some((e) => e.code !== DUPLICATE_KEY)
    ) {
      throw error;
    }
    result = (error as MongoBulkWriteError).result;
  }

  const newlyInvited = Object.keys(result.upsertedIds).map((index) =>
    toInvite[Number(index)].toString(),
  );
  notifyUsers(db, newlyInvited, "invites", bandObjectId.toString(), {
    title: `Band invite: ${band.name}`,
    body: `${inviter.name ?? "Someone"} invited you to join ${band.name}`,
    url: "/",
    tag: `invite-${bandObjectId.toString()}`,
  });
}

// verify user is admin of a band
export async function verifyAdmin(bandId: unknown) {
  const bandObjectId = toObjectId(bandId, "band ID");
  const { db, user } = await getAuthUser();

  const band = await getBandsCollection(db).findOne({ _id: bandObjectId });
  if (!band) throw new UserError("Band not found");

  const userId = user._id.toString();
  if (!isAdminOrCreator(band, userId))
    throw new UserError("Only admins can perform this action");

  return {
    db,
    user,
    band,
    bandObjectId,
    userId,
    isCreator: isBandCreator(band, userId),
  };
}

"use server";

import { getAuthUser } from "@/app/lib/server/auth";
import { Db, ObjectId } from "mongodb";
import { put } from "@vercel/blob";
import {
  bandImageUrl,
  buildImageBlobPath,
  validateImageFile,
} from "@/app/lib/server/customSongImages";
import { deleteBlobsQuietly } from "@/app/lib/server/blobStorage";
import { runAction, UserError } from "@/app/lib/actionResult";
import { isBandMember, toObjectId, toObjectIds } from "@/app/lib/server/utils";
import {
  BandDocument,
  getBandsCollection,
  getInvitesCollection,
  isBandCreator,
  readUserId,
  sendBandInvites,
  setMemberBandDataActiveState,
  verifyAdmin,
} from "@/app/lib/server/bands";
import { BandRole } from "@/app/types";
import {
  readOptionalString,
  readString,
  readStringArray,
} from "@/app/lib/validate";

// delete a band and all its related data
async function deleteBandCascade(db: Db, oid: ObjectId) {
  const band = await getBandsCollection(db).findOne(
    { _id: oid },
    { projection: { imageBlobUrl: 1 } },
  );
  await deleteBlobsQuietly(band?.imageBlobUrl, "band image");

  const rehearsalIds = (
    await db
      .collection("rehearsals")
      .find({ bandId: oid })
      .project({ _id: 1 })
      .toArray()
  ).map((rehearsal) => rehearsal._id);

  // chat attachments, custom song audio and images live in blob storage, so
  // remove those files too
  const chatBlobUrls = (
    await db
      .collection("band_messages")
      .find({ bandId: oid, "attachments.0": { $exists: true } })
      .project({ attachments: 1 })
      .toArray()
  ).flatMap((m) =>
    (m.attachments as { blobUrl: string }[]).map((a) => a.blobUrl),
  );
  const songBlobUrls = (
    await db
      .collection("custom_songs")
      .find({ bandId: oid })
      .project({ audioBlobUrl: 1, imageBlobUrl: 1 })
      .toArray()
  ).flatMap((s) => [s.audioBlobUrl, s.imageBlobUrl]);
  const albumBlobUrls = (
    await db
      .collection("custom_albums")
      .find({ bandId: oid })
      .project({ imageBlobUrl: 1 })
      .toArray()
  ).map((a) => a.imageBlobUrl);
  await deleteBlobsQuietly(
    [...chatBlobUrls, ...songBlobUrls, ...albumBlobUrls],
    "band",
  );

  await getBandsCollection(db).deleteOne({ _id: oid });
  await Promise.all([
    getInvitesCollection(db).deleteMany({ bandId: oid }),
    db.collection("band_messages").deleteMany({ bandId: oid }),
    db.collection("band_chat_typing").deleteMany({ bandId: oid }),
    db.collection("setlists").deleteMany({ bandId: oid }),
    db.collection("custom_songs").deleteMany({ bandId: oid }),
    db.collection("custom_albums").deleteMany({ bandId: oid }),
    db.collection("covers").deleteMany({ bandId: oid }),
    db.collection("learnt_songs").deleteMany({ bandId: oid }),
    db.collection("learning_songs").deleteMany({ bandId: oid }),
    db.collection("rehearsals").deleteMany({ bandId: oid }),
    rehearsalIds.length > 0
      ? db.collection("rehearsal_availability").deleteMany({
          rehearsalId: { $in: rehearsalIds },
        })
      : null,
  ]);
}

export async function createBandAction(
  name: string,
  description: string,
  memberIds: string[],
) {
  return runAction("Failed to create band", async () => {
    const bandName = readString(name, "band name", 100).trim();
    if (!bandName) throw new UserError("Band name is required");
    const bandDescription =
      readOptionalString(description, "description", 2000)?.trim() ?? "";
    const requestedIds = toObjectIds(readStringArray(memberIds, "members"));

    const { db, user } = await getAuthUser();
    const creatorId = user._id.toString();

    // the creator is the only member to start with - everyone else picked
    // gets an invite they have to accept. only invite people who really exist
    const existingIds = (
      await db
        .collection("users")
        .find({ _id: { $in: requestedIds, $ne: user._id } })
        .project({ _id: 1 })
        .toArray()
    ).map((u) => u._id as ObjectId);

    const band: BandDocument = {
      name: bandName,
      description: bandDescription,
      members: [{ userId: creatorId, role: "creator" }],
      createdAt: new Date(),
    };
    const result = await getBandsCollection(db).insertOne(band);

    await sendBandInvites(db, result.insertedId, band, user, existingIds);

    return { bandId: result.insertedId.toString() };
  });
}

export async function deleteBandAction(bandId: string) {
  return runAction("Failed to delete band", async () => {
    const { db, bandObjectId, isCreator } = await verifyAdmin(bandId);

    if (!isCreator) {
      throw new UserError("Only the band creator can delete the band");
    }

    await deleteBandCascade(db, bandObjectId);
  });
}

export async function updateBandAction(
  bandId: string,
  name: string,
  description: string,
) {
  return runAction("Failed to update band", async () => {
    const bandName = readString(name, "band name", 100).trim();
    if (!bandName) throw new UserError("Band name is required");
    const bandDescription =
      readOptionalString(description, "description", 2000)?.trim() ?? "";

    const { db, bandObjectId } = await verifyAdmin(bandId);

    await getBandsCollection(db).updateOne(
      { _id: bandObjectId },
      { $set: { name: bandName, description: bandDescription } },
    );
  });
}

// band images are optional, uploaded after the band is created or from settings
export async function uploadBandImageAction(
  bandId: string,
  formData: FormData,
) {
  return runAction("Failed to upload image", async () => {
    const { db, band, bandObjectId } = await verifyAdmin(bandId);
    const file = validateImageFile(formData.get("image"));
    const id = bandObjectId.toString();

    await deleteBlobsQuietly(band.imageBlobUrl, "band image");

    const blob = await put(
      buildImageBlobPath("bands", id, id, file.name || "image"),
      file,
      { access: "private", addRandomSuffix: false, contentType: file.type },
    );

    const image = bandImageUrl(id, Date.now());
    await getBandsCollection(db).updateOne(
      { _id: bandObjectId },
      {
        $set: {
          imageBlobUrl: blob.url,
          imageMimeType: file.type,
          image,
        },
      },
    );

    return { image };
  });
}

export async function deleteBandImageAction(bandId: string) {
  return runAction("Failed to remove image", async () => {
    const { db, band, bandObjectId } = await verifyAdmin(bandId);

    await deleteBlobsQuietly(band.imageBlobUrl, "band image");

    await getBandsCollection(db).updateOne(
      { _id: bandObjectId },
      { $unset: { imageBlobUrl: "", imageMimeType: "", image: "" } },
    );
  });
}

export async function removeMemberAction(bandId: string, memberId: string) {
  return runAction("Failed to remove member", async () => {
    const id = readUserId(memberId);
    const { db, band, bandObjectId } = await verifyAdmin(bandId);

    if (isBandCreator(band, id)) {
      throw new UserError("Cannot remove the band creator");
    }

    await getBandsCollection(db).updateOne(
      { _id: bandObjectId },
      { $pull: { members: { userId: id } } },
    );

    await setMemberBandDataActiveState(db, bandObjectId, id, false);
  });
}

export async function toggleAdminAction(bandId: string, memberId: string) {
  return runAction("Failed to update role", async () => {
    const id = readUserId(memberId);
    const { db, band, bandObjectId } = await verifyAdmin(bandId);

    if (isBandCreator(band, id)) {
      throw new UserError("Cannot change the creator's admin role");
    }

    const entry = band.members.find((m) => m.userId === id);
    if (!entry) {
      throw new UserError("User is not a band member");
    }

    const isCurrentlyAdmin = entry.role === "admin";
    const newRole: BandRole = isCurrentlyAdmin ? "member" : "admin";

    await getBandsCollection(db).updateOne(
      { _id: bandObjectId, "members.userId": id },
      { $set: { "members.$.role": newRole } },
    );

    return {
      isAdmin: !isCurrentlyAdmin,
      message: isCurrentlyAdmin ? "Admin role removed" : "Admin role granted",
    };
  });
}

export async function leaveBandAction(bandId: string) {
  return runAction("Failed to leave band", async () => {
    const bandObjectId = toObjectId(bandId, "band ID");
    const { db, user } = await getAuthUser();

    const band = await getBandsCollection(db).findOne({ _id: bandObjectId });
    if (!band) throw new UserError("Band not found");

    const userId = user._id.toString();
    if (!isBandMember(band, userId)) {
      throw new UserError("You are not a member of this band");
    }

    // if only one member left, delete the band entirely
    if (band.members.length <= 1) {
      await deleteBandCascade(db, bandObjectId);
      return { bandDeleted: true };
    }

    await getBandsCollection(db).updateOne(
      { _id: bandObjectId },
      { $pull: { members: { userId } } },
    );

    await setMemberBandDataActiveState(db, bandObjectId, userId, false);

    // if the leaving user was creator, promote the last remaining member
    if (isBandCreator(band, userId)) {
      const remainingMembers = band.members.filter((m) => m.userId !== userId);
      const newCreatorId = remainingMembers[remainingMembers.length - 1].userId;

      await getBandsCollection(db).updateOne(
        { _id: bandObjectId, "members.userId": newCreatorId },
        { $set: { "members.$.role": "creator" } },
      );
    }

    return { bandDeleted: false };
  });
}

export async function transferCreatorAction(
  bandId: string,
  newCreatorId: string,
) {
  return runAction("Failed to transfer creator role", async () => {
    const newId = readUserId(newCreatorId);
    const { db, band, bandObjectId, userId, isCreator } =
      await verifyAdmin(bandId);

    if (!isCreator) {
      throw new UserError("Only the creator can transfer the creator role");
    }

    if (!isBandMember(band, newId)) {
      throw new UserError("Target user is not a band member");
    }

    if (isBandCreator(band, newId)) {
      throw new UserError("User is already the creator");
    }

    // demote current creator to admin, promote new creator
    await getBandsCollection(db).updateOne(
      { _id: bandObjectId, "members.userId": userId },
      { $set: { "members.$.role": "admin" } },
    );
    await getBandsCollection(db).updateOne(
      { _id: bandObjectId, "members.userId": newId },
      { $set: { "members.$.role": "creator" } },
    );
  });
}

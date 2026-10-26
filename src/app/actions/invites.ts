"use server";

import { getAuthUser } from "@/app/lib/server/auth";
import { ObjectId } from "mongodb";
import { runAction, UserError } from "@/app/lib/actionResult";
import { isBandMember, toObjectId } from "@/app/lib/server/utils";
import {
  getBandsCollection,
  getInvitesCollection,
  readUserId,
  sendBandInvites,
  setMemberBandDataActiveState,
  verifyAdmin,
} from "@/app/lib/server/bands";

// people join a band by accepting an invite rather than being added directly
export async function inviteMemberAction(bandId: string, userId: string) {
  return runAction("Failed to send invite", async () => {
    const inviteeId = readUserId(userId);
    const { db, user, band, bandObjectId } = await verifyAdmin(bandId);

    if (isBandMember(band, inviteeId)) {
      throw new UserError("User is already a band member");
    }

    const targetUser = await db
      .collection("users")
      .findOne({ _id: new ObjectId(inviteeId) }, { projection: { _id: 1 } });
    if (!targetUser) throw new UserError("User not found");

    await sendBandInvites(db, bandObjectId, band, user, [targetUser._id]);
  });
}

export async function cancelInviteAction(bandId: string, userId: string) {
  return runAction("Failed to cancel invite", async () => {
    const inviteeId = readUserId(userId);
    const { db, bandObjectId } = await verifyAdmin(bandId);

    await getInvitesCollection(db).deleteOne({
      bandId: bandObjectId,
      userId: new ObjectId(inviteeId),
    });
  });
}

// bandId is null when the invite was cancelled or the band deleted in the
// meantime, so the page can drop it rather than show an error
export async function acceptInviteAction(inviteId: string) {
  return runAction("Failed to accept invite", async () => {
    const inviteObjectId = toObjectId(inviteId, "invite ID");
    const { db, user } = await getAuthUser();

    // deleting it straight away means accepting twice can't add someone twice
    const invite = await getInvitesCollection(db).findOneAndDelete({
      _id: inviteObjectId,
      userId: user._id,
    });
    if (!invite) return { bandId: null };

    const band = await getBandsCollection(db).findOne({ _id: invite.bandId });
    if (!band) return { bandId: null };

    const userId = user._id.toString();
    await getBandsCollection(db).updateOne(
      { _id: invite.bandId, "members.userId": { $ne: userId } },
      { $push: { members: { userId, role: "member" } } },
    );

    await setMemberBandDataActiveState(db, invite.bandId, userId, true);

    return { bandId: invite.bandId.toString() };
  });
}

// declining an invite that's already gone (cancelled, or declined on another
// device) still counts as done
export async function declineInviteAction(inviteId: string) {
  return runAction("Failed to decline invite", async () => {
    const inviteObjectId = toObjectId(inviteId, "invite ID");
    const { db, user } = await getAuthUser();

    await getInvitesCollection(db).deleteOne({
      _id: inviteObjectId,
      userId: user._id,
    });
  });
}

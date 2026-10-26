import { getAuthUser } from "@/app/lib/server/auth";
import { serverErrorResponse } from "@/app/lib/server/utils";
import { getUserLearntSongs } from "@/app/lib/server/learntSongs";
import {
  BandDocument,
  getInvitesCollection,
  isAdminOrCreator,
} from "@/app/lib/server/bands";
import { isBandMember } from "@/app/lib/server/utils";
import { ProfileInviteBand, PublicUserProfile } from "@/app/types";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// fetch another user's public profile, plus the current user's learnt songs for comparison
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, user: currentUser } = await getAuthUser();
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const profileUser = await db
      .collection("users")
      .findOne(
        { _id: new ObjectId(id) },
        { projection: { name: 1, image: 1, learntSongsPrivate: 1 } },
      );
    if (!profileUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isPrivate = profileUser.learntSongsPrivate === true;

    const [theirSongs, mySongs, myBands] = await Promise.all([
      isPrivate ? [] : getUserLearntSongs(db, profileUser._id),
      getUserLearntSongs(db, currentUser._id),
      db
        .collection<BandDocument>("bands")
        .find(
          { "members.userId": currentUser._id.toString() },
          { projection: { name: 1, members: 1 } },
        )
        .toArray(),
    ]);

    // custom song audio and notes belong to a band, so only share them with its members
    const myBandIds = new Set(myBands.map((band) => band._id.toString()));
    const songs = theirSongs.map((song) =>
      song.isCustom && !(song.bandId && myBandIds.has(song.bandId))
        ? { ...song, preview: undefined, notes: undefined }
        : song,
    );

    // bands the current user admins, and whether this user is already in or invited to each
    const adminBands = myBands.filter((band) =>
      isAdminOrCreator(band, currentUser._id.toString()),
    );
    const invites =
      adminBands.length > 0
        ? await getInvitesCollection(db)
            .find(
              {
                userId: profileUser._id,
                bandId: { $in: adminBands.map((band) => band._id!) },
              },
              { projection: { bandId: 1 } },
            )
            .toArray()
        : [];
    const invitedBandIds = new Set(
      invites.map((invite) => invite.bandId.toString()),
    );
    const inviteBands: ProfileInviteBand[] = adminBands.map((band) => ({
      _id: band._id!.toString(),
      name: band.name,
      status: isBandMember(band, id)
        ? "member"
        : invitedBandIds.has(band._id!.toString())
          ? "invited"
          : "none",
    }));

    const profile: PublicUserProfile = {
      user: {
        _id: profileUser._id.toString(),
        name: (profileUser.name as string | null) ?? "Unknown user",
        image: (profileUser.image as string | null) ?? undefined,
      },
      isPrivate,
      songs,
      mySongs,
      inviteBands,
    };

    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    return serverErrorResponse(error, "Failed to fetch user profile");
  }
}

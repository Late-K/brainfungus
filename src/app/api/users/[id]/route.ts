import { getAuthUser } from "@/app/lib/auth";
import { getServerErrorStatus } from "@/app/lib/serverUtils";
import { getUserLearntSongs } from "@/app/lib/learntSongsUtils";
import { PublicUserProfile } from "@/app/types";
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
        .collection("bands")
        .find(
          { "members.userId": currentUser._id.toString() },
          { projection: { _id: 1 } },
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

    const profile: PublicUserProfile = {
      user: {
        _id: profileUser._id.toString(),
        name: (profileUser.name as string | null) ?? "Unknown user",
        image: (profileUser.image as string | null) ?? undefined,
      },
      isPrivate,
      songs,
      mySongs,
    };

    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    const status = getServerErrorStatus(error);
    return NextResponse.json(
      {
        error:
          status === 500
            ? "Failed to fetch user profile"
            : (error as Error).message,
      },
      { status },
    );
  }
}

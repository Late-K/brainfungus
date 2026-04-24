import {
  COLLECTIONS,
  getServerErrorStatus,
  normaliseSongId,
  requireBandMemberContext,
} from "@/app/lib/serverData";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// GET - fetch learnt songs for a band
export async function GET(request: NextRequest) {
  try {
    const bandId = request.nextUrl.searchParams.get("bandId");
    if (!bandId) {
      return NextResponse.json(
        { error: "Band ID is required" },
        { status: 400 },
      );
    }

    const { db, band } = await requireBandMemberContext(bandId);

    const memberObjectIds = band.memberIds
      .filter((id: string) => ObjectId.isValid(id))
      .map((id: string) => new ObjectId(id));

    const learnt = await db
      .collection(COLLECTIONS.learntSongs)
      .find({
        userId: { $in: memberObjectIds },
        active: { $ne: false },
      })
      .toArray();

    const userIds = [
      ...new Set(learnt.map((entry) => entry.userId.toString())),
    ];
    const userDocs = await db
      .collection(COLLECTIONS.users)
      .find({
        _id: { $in: userIds.map((id) => new ObjectId(id)) },
      })
      .toArray();

    const userMap = new Map(
      userDocs.map((userDoc) => [
        userDoc._id.toString(),
        {
          userId: userDoc._id.toString(),
          userName: userDoc.name,
          userImage: userDoc.image,
        },
      ]),
    );

    const songLearntMap: Record<
      string,
      { userId: string; userName: string; userImage?: string }[]
    > = {};
    const seen = new Set<string>();

    for (const entry of learnt) {
      const user = userMap.get(entry.userId.toString());
      if (!user) {
        continue;
      }

      const songId = normaliseSongId(entry.songId);
      const seenKey = `${songId}:${user.userId}`;

      if (seen.has(seenKey)) {
        continue;
      }

      seen.add(seenKey);

      if (!songLearntMap[songId]) {
        songLearntMap[songId] = [];
      }

      songLearntMap[songId].push(user);
    }

    return NextResponse.json({ learntMap: songLearntMap }, { status: 200 });
  } catch (error) {
    console.error("Error fetching learnt songs:", error);
    const status = getServerErrorStatus(error);

    return NextResponse.json(
      {
        error:
          status === 500
            ? "Failed to fetch learnt songs"
            : (error as Error).message,
      },
      { status },
    );
  }
}

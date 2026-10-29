import {
  getMemberIds,
  normaliseSongId,
  requireBandMemberContext,
  serverErrorResponse,
  toObjectIds,
} from "@/app/lib/server/utils";
import { NextRequest, NextResponse } from "next/server";

// fetch learnt songs for a band
export async function GET(request: NextRequest) {
  try {
    const bandId = request.nextUrl.searchParams.get("bandId");
    if (!bandId) {
      return NextResponse.json(
        { error: "Band ID is required" },
        { status: 400 },
      );
    }

    const { db, band, user: currentUser } =
      await requireBandMemberContext(bandId);

    const memberObjectIds = toObjectIds(getMemberIds(band));

    const [learnt, learning] = await Promise.all([
      db
        .collection("learnt_songs")
        .find({
          userId: { $in: memberObjectIds },
          active: { $ne: false },
        })
        .toArray(),
      db
        .collection("learning_songs")
        .find({ userId: currentUser._id }, { projection: { songId: 1 } })
        .toArray(),
    ]);

    const userIds = [
      ...new Set(learnt.map((entry) => entry.userId.toString())),
    ];
    const userDocs = await db
      .collection("users")
      .find({
        _id: { $in: toObjectIds(userIds) },
      })
      .toArray();

    const userMap = new Map(
      userDocs.map((userDoc) => [
        userDoc._id.toString(),
        {
          userId: userDoc._id.toString(),
          userName: userDoc.name,
          userEmail: userDoc.email,
          userImage: userDoc.image,
        },
      ]),
    );

    const songLearntMap: Record<
      string,
      {
        userId: string;
        userName: string;
        userEmail: string;
        userImage?: string;
      }[]
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

    // only the current user's own learning songs, for their Learning buttons
    const learningIds = [
      ...new Set(learning.map((entry) => normaliseSongId(entry.songId))),
    ];

    return NextResponse.json(
      { learntMap: songLearntMap, learningIds },
      { status: 200 },
    );
  } catch (error) {
    return serverErrorResponse(error, "Failed to fetch learnt songs");
  }
}

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { getDb } from "@/app/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// GET - fetch learnt songs for a band
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bandId = request.nextUrl.searchParams.get("bandId");
    if (!bandId) {
      return NextResponse.json(
        { error: "Band ID is required" },
        { status: 400 },
      );
    }

    const db = await getDb();

    const currentUser = await db
      .collection("users")
      .findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const band = await db
      .collection("bands")
      .findOne({ _id: new ObjectId(bandId) });
    if (!band || !band.memberIds.includes(currentUser._id.toString())) {
      return NextResponse.json(
        { error: "Not a member of this band" },
        { status: 403 },
      );
    }

    const memberObjectIds = band.memberIds
      .filter((id: string) => ObjectId.isValid(id))
      .map((id: string) => new ObjectId(id));

    const learnt = await db
      .collection("learnt_songs")
      .find({
        bandId: new ObjectId(bandId),
        userId: { $in: memberObjectIds },
        active: { $ne: false },
      })
      .toArray();

    // get user details for each learnt song
    const userIds = [...new Set(learnt.map((l) => l.userId.toString()))];
    const userDocs = await db
      .collection("users")
      .find({
        _id: { $in: userIds.map((id) => new ObjectId(id)) },
      })
      .toArray();

    const userMap = new Map(
      userDocs.map((u) => [
        u._id.toString(),
        { userId: u._id.toString(), userName: u.name, userImage: u.image },
      ]),
    );

    // group by songId
    const songLearntMap: Record<
      string,
      { userId: string; userName: string; userImage?: string }[]
    > = {};
    for (const entry of learnt) {
      const user = userMap.get(entry.userId.toString());
      if (user) {
        if (!songLearntMap[entry.songId]) {
          songLearntMap[entry.songId] = [];
        }
        songLearntMap[entry.songId].push(user);
      }
    }

    return NextResponse.json({ learntMap: songLearntMap }, { status: 200 });
  } catch (error) {
    console.error("Error fetching learnt songs:", error);
    return NextResponse.json(
      { error: "Failed to fetch learnt songs" },
      { status: 500 },
    );
  }
}

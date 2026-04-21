import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { getDb } from "@/app/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

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
    if (!band) {
      return NextResponse.json({ error: "Band not found" }, { status: 404 });
    }

    if (!band.memberIds.includes(currentUser._id.toString())) {
      return NextResponse.json(
        { error: "Not a member of this band" },
        { status: 403 },
      );
    }

    const covers = await db
      .collection("covers")
      .find({ bandId: new ObjectId(bandId) })
      .sort({ createdAt: -1 })
      .toArray();

    const formatted = covers.map((cover) => ({
      _id: cover._id.toString(),
      songId: cover.songId,
      title: cover.title,
      artist: cover.artist,
      album: cover.album,
      duration: cover.duration,
      preview: cover.preview,
      image: cover.image,
      createdAt:
        cover.createdAt instanceof Date
          ? cover.createdAt.toISOString()
          : cover.createdAt,
      updatedAt:
        cover.updatedAt instanceof Date
          ? cover.updatedAt.toISOString()
          : cover.updatedAt,
    }));

    return NextResponse.json({ covers: formatted }, { status: 200 });
  } catch (error) {
    console.error("Error fetching covers:", error);
    return NextResponse.json(
      { error: "Failed to fetch covers" },
      { status: 500 },
    );
  }
}

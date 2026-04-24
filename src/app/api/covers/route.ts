import {
  COLLECTIONS,
  getServerErrorStatus,
  requireBandMemberContext,
} from "@/app/lib/serverData";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const bandId = request.nextUrl.searchParams.get("bandId");
    if (!bandId) {
      return NextResponse.json(
        { error: "Band ID is required" },
        { status: 400 },
      );
    }

    const { db, bandObjectId } = await requireBandMemberContext(bandId);

    const covers = await db
      .collection(COLLECTIONS.covers)
      .find({ bandId: bandObjectId })
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
    const status = getServerErrorStatus(error);
    return NextResponse.json(
      {
        error:
          status === 500 ? "Failed to fetch covers" : (error as Error).message,
      },
      { status },
    );
  }
}

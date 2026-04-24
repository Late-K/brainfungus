import {
  COLLECTIONS,
  getServerErrorStatus,
  requireBandMemberContext,
} from "@/app/lib/serverData";
import { NextRequest, NextResponse } from "next/server";

// GET - fetch all custom songs for a band
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

    const bandSongs = await db
      .collection(COLLECTIONS.customSongs)
      .find({ bandId: bandObjectId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ songs: bandSongs }, { status: 200 });
  } catch (error) {
    console.error("Error fetching songs:", error);
    const status = getServerErrorStatus(error);
    return NextResponse.json(
      {
        error:
          status === 500 ? "Failed to fetch songs" : (error as Error).message,
      },
      { status },
    );
  }
}

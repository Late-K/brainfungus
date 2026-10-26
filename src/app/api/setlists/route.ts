import {
  requireBandMemberContext,
  serverErrorResponse,
} from "@/app/lib/server/utils";
import { getSetlistSongEnricher } from "@/app/lib/server/setlists";
import { NextRequest, NextResponse } from "next/server";

// fetch all setlists for a band
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

    const bandSetlists = await db
      .collection("setlists")
      .find({ bandId: bandObjectId })
      .sort({ createdAt: -1 })
      .toArray();

    const enrich = await getSetlistSongEnricher(
      db,
      bandObjectId,
      bandSetlists.flatMap((setlist) => setlist.songs || []),
    );

    const enrichedSetlists = bandSetlists.map((setlist) => ({
      ...setlist,
      songs: (setlist.songs || []).map(enrich),
    }));

    return NextResponse.json({ setlists: enrichedSetlists }, { status: 200 });
  } catch (error) {
    return serverErrorResponse(error, "Failed to fetch setlists");
  }
}

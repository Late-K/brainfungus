import { getAuthUser } from "@/app/lib/server/auth";
import { requireBandMember, serverErrorResponse } from "@/app/lib/server/utils";
import { getSetlistSongEnricher } from "@/app/lib/server/setlists";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// fetch a single setlist
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const notFound = () =>
      NextResponse.json({ error: "Setlist not found" }, { status: 404 });
    if (!ObjectId.isValid(id)) return notFound();

    const { db, user } = await getAuthUser();
    const setlist = await db
      .collection("setlists")
      .findOne({ _id: new ObjectId(id) });
    if (!setlist) return notFound();

    const { bandObjectId } = await requireBandMember(
      db,
      user._id.toString(),
      setlist.bandId,
    );

    const songs = setlist.songs || [];
    const enrich = await getSetlistSongEnricher(db, bandObjectId, songs);

    return NextResponse.json(
      { setlist: { ...setlist, songs: songs.map(enrich) } },
      { status: 200 },
    );
  } catch (error) {
    return serverErrorResponse(error, "Failed to fetch setlist");
  }
}

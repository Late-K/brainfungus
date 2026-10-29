import { getAuthUser } from "@/app/lib/server/auth";
import { serverErrorResponse } from "@/app/lib/server/utils";
import { streamPrivateBlob } from "@/app/lib/server/blobStorage";
import { canAccessBandSongs } from "@/app/lib/server/customSongAccess";
import { UserError } from "@/app/lib/actionResult";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// stream a custom song's audio - to anyone, unless its band keeps its songs
// private, then only to the band's members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const notFound = () =>
      NextResponse.json({ error: "No audio found" }, { status: 404 });
    if (!ObjectId.isValid(id)) return notFound();

    const { db, user } = await getAuthUser();
    const song = await db
      .collection("custom_songs")
      .findOne(
        { _id: new ObjectId(id) },
        { projection: { bandId: 1, audioBlobUrl: 1, audioMimeType: 1 } },
      );
    if (!song) return notFound();

    if (!(await canAccessBandSongs(db, user._id.toString(), song.bandId))) {
      throw new UserError("Not a member of this band");
    }

    const blobUrl = song.audioBlobUrl as string | undefined;
    if (!blobUrl) return notFound();

    return streamPrivateBlob(blobUrl, {
      range: request.headers.get("range"),
      headers: {
        "Content-Type":
          (song.audioMimeType as string | undefined) || "audio/mpeg",
        "Cache-Control":
          "private, no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (error) {
    return serverErrorResponse(error, "Failed to stream audio");
  }
}

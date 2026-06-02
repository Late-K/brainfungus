import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { getDb } from "@/app/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

async function getAuthorisedSong(songId: string, userEmail: string) {
  const db = await getDb();
  const currentUser = await db
    .collection("users")
    .findOne({ email: userEmail });
  if (!currentUser) return null;

  const song = await db
    .collection("custom_songs")
    .findOne({ _id: new ObjectId(songId) });
  if (!song) return null;

  const band = await db.collection("bands").findOne({ _id: song.bandId });
  if (
    !band ||
    !(band.members as Array<{ userId: string }>)?.some(
      (m) => m.userId === currentUser._id.toString(),
    )
  )
    return null;

  return { db, song };
}

// stream song audio to the browser
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const authorised = await getAuthorisedSong(id, session.user.email);
    if (!authorised) {
      return NextResponse.json(
        { error: "Song not found or not authorised" },
        { status: 404 },
      );
    }

    const blobUrl = authorised.song.audioBlobUrl as string | undefined;
    if (!blobUrl) {
      return NextResponse.json({ error: "No audio found" }, { status: 404 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const rangeHeader = request.headers.get("range");
    const blobRequestHeaders: Record<string, string> = {};
    if (token) {
      blobRequestHeaders.Authorization = `Bearer ${token}`;
    }
    if (rangeHeader) {
      blobRequestHeaders.Range = rangeHeader;
    }

    const blobResponse = await fetch(blobUrl, {
      headers: Object.keys(blobRequestHeaders).length
        ? blobRequestHeaders
        : undefined,
      cache: "no-store",
    });

    if (!blobResponse.ok || !blobResponse.body) {
      return NextResponse.json(
        { error: "Audio file unavailable" },
        { status: 502 },
      );
    }

    const responseHeaders = new Headers();
    responseHeaders.set(
      "Content-Type",
      (authorised.song.audioMimeType as string | undefined) ||
        blobResponse.headers.get("content-type") ||
        "audio/mpeg",
    );
    responseHeaders.set("Accept-Ranges", "bytes");

    const contentLength = blobResponse.headers.get("content-length");
    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength);
    }

    const contentRange = blobResponse.headers.get("content-range");
    if (contentRange) {
      responseHeaders.set("Content-Range", contentRange);
    }

    responseHeaders.set(
      "Cache-Control",
      "private, no-store, no-cache, must-revalidate, max-age=0",
    );

    return new NextResponse(blobResponse.body, {
      status: blobResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Error streaming audio:", error);
    return NextResponse.json(
      { error: "Failed to stream audio" },
      { status: 500 },
    );
  }
}

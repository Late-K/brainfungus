import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { getDb } from "@/app/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

const max_audio_bytes = 8 * 1024 * 1024; // 8 MB
const allowed_types = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/flac",
  "audio/webm",
];

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

// POST /api/songs/[id]/audio — upload audio file
export async function POST(
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

    const formData = await request.formData();
    const file = formData.get("audio");
    const durationRaw = formData.get("durationSeconds");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 },
      );
    }

    if (!allowed_types.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported audio format" },
        { status: 400 },
      );
    }

    if (file.size > max_audio_bytes) {
      return NextResponse.json(
        { error: "File too large — max 8 MB" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const audioUrl = `data:${file.type};base64,${base64}`;
    const parsedDuration =
      typeof durationRaw === "string" ? Number(durationRaw) : NaN;
    const duration =
      Number.isFinite(parsedDuration) && parsedDuration > 0
        ? Math.round(parsedDuration)
        : undefined;

    const setFields: Record<string, unknown> = {
      audioUrl,
      updatedAt: new Date(),
    };
    if (duration !== undefined) {
      setFields.duration = duration;
    }

    await authorised.db
      .collection("custom_songs")
      .updateOne({ _id: new ObjectId(id) }, { $set: setFields });

    return NextResponse.json({ audioUrl, duration }, { status: 200 });
  } catch (error) {
    console.error("Error uploading audio:", error);
    return NextResponse.json(
      { error: "Failed to upload audio" },
      { status: 500 },
    );
  }
}

// DELETE /api/songs/[id]/audio — remove audio from song
export async function DELETE(
  _request: NextRequest,
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

    await authorised.db
      .collection("custom_songs")
      .updateOne(
        { _id: new ObjectId(id) },
        { $unset: { audioUrl: "" }, $set: { updatedAt: new Date() } },
      );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting audio:", error);
    return NextResponse.json(
      { error: "Failed to delete audio" },
      { status: 500 },
    );
  }
}

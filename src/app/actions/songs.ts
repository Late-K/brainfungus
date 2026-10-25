"use server";

import { getAuthUser } from "@/app/lib/auth";
import {
  normaliseSongId,
  requireBandMember,
  requireBandMemberContext,
} from "@/app/lib/serverUtils";
import {
  albumImageUrl,
  buildImageBlobPath,
  songImageUrl,
  validateImageFile,
} from "@/app/lib/customSongImages";
import { del, put } from "@vercel/blob";
import { ObjectId } from "mongodb";

async function deleteBlobQuietly(blobUrl: unknown, label: string) {
  if (typeof blobUrl !== "string" || !blobUrl) return;
  try {
    await del(blobUrl);
  } catch (blobErr) {
    console.error(`Failed to delete ${label} blob:`, blobErr);
  }
}

async function requireSongForMember(songId: string) {
  if (!ObjectId.isValid(songId)) throw new Error("Song not found");
  const { db, user } = await getAuthUser();

  const song = await db
    .collection("custom_songs")
    .findOne({ _id: new ObjectId(songId) });
  if (!song) throw new Error("Song not found");

  await requireBandMember(db, user._id.toString(), song.bandId);
  return { db, song };
}

function buildAudioBlobPath(
  bandId: unknown,
  songId: string,
  fileName: string,
): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const stamp = Date.now();
  return `audio/${String(bandId)}/${songId}/${stamp}-${safeName}`;
}

export async function createSongAction(
  bandId: string,
  title: string,
  notes: string = "",
  album: string = "",
) {
  try {
    if (!bandId || !title) {
      throw new Error("Band ID and title are required");
    }

    const { db, user, bandObjectId } = await requireBandMemberContext(bandId);

    const newSong = {
      bandId: bandObjectId,
      creatorId: user._id,
      title,
      notes: notes || "",
      album: album || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("custom_songs").insertOne(newSong);

    return {
      success: true,
      song: {
        _id: result.insertedId.toString(),
        bandId: bandId,
        creatorId: user._id.toString(),
        title,
        notes: notes || "",
        album: album || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Error creating song:", error);
    throw error instanceof Error ? error : new Error("Failed to create song");
  }
}

export async function deleteSongAction(songId: string) {
  try {
    if (!ObjectId.isValid(songId)) throw new Error("Song not found");
    const { db, user } = await getAuthUser();

    // Get the song
    const song = await db
      .collection("custom_songs")
      .findOne({ _id: new ObjectId(songId) });
    if (!song) {
      throw new Error("Song not found");
    }

    // verify user is a member of the band
    await requireBandMember(db, user._id.toString(), song.bandId);

    const audioBlobUrl = song.audioBlobUrl as string | undefined;
    if (audioBlobUrl) {
      try {
        await del(audioBlobUrl);
      } catch (blobErr) {
        console.error("Failed to delete audio blob for song:", blobErr);
      }
    }
    await deleteBlobQuietly(song.imageBlobUrl, "song image");

    const normalisedSongId = normaliseSongId(songId);

    //remove all references from this custom song
    await Promise.all([
      db
        .collection("setlists")
        .updateMany({ bandId: song.bandId, "songs.id": normalisedSongId }, {
          $pull: {
            songs: { id: normalisedSongId },
          },
          $set: { updatedAt: new Date() },
        } as Record<string, unknown>),
      db.collection("learnt_songs").deleteMany({
        bandId: song.bandId,
        songId: normalisedSongId,
      }),
    ]);

    // delete the song
    await db
      .collection("custom_songs")
      .deleteOne({ _id: new ObjectId(songId) });

    return {
      success: true,
      message: "Song deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting song:", error);
    throw error instanceof Error ? error : new Error("Failed to delete song");
  }
}

export async function updateSongAction(
  songId: string,
  updates: { title?: string; notes?: string; album?: string },
) {
  try {
    if (!ObjectId.isValid(songId)) throw new Error("Song not found");
    const { db, user } = await getAuthUser();

    const song = await db
      .collection("custom_songs")
      .findOne({ _id: new ObjectId(songId) });
    if (!song) {
      throw new Error("Song not found");
    }

    // verify user is a member of the band
    await requireBandMember(db, user._id.toString(), song.bandId);

    const setFields: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.title !== undefined) setFields.title = updates.title;
    if (updates.notes !== undefined) setFields.notes = updates.notes;
    if (updates.album !== undefined) setFields.album = updates.album;

    await db
      .collection("custom_songs")
      .updateOne({ _id: new ObjectId(songId) }, { $set: setFields });

    return { success: true };
  } catch (error) {
    console.error("Error updating song:", error);
    throw error instanceof Error ? error : new Error("Failed to update song");
  }
}

export async function reorderAlbumSongsAction(
  bandId: string,
  album: string,
  songIds: string[],
) {
  try {
    const { db, bandObjectId } = await requireBandMemberContext(bandId);

    const bulkOps = songIds
      .filter((id) => ObjectId.isValid(id))
      .map((id, index) => ({
        updateOne: {
          filter: { _id: new ObjectId(id), bandId: bandObjectId },
          update: { $set: { order: index } },
        },
      }));

    if (bulkOps.length > 0) {
      await db.collection("custom_songs").bulkWrite(bulkOps);
    }

    return { success: true };
  } catch (error) {
    console.error("Error reordering songs:", error);
    throw error instanceof Error ? error : new Error("Failed to reorder songs");
  }
}

const MAX_AUDIO_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/flac",
  "audio/webm",
];

export async function uploadAudioAction(
  songId: string,
  formData: FormData,
): Promise<{ audioUrl: string; duration?: number }> {
  if (!ObjectId.isValid(songId)) throw new Error("Song not found");

  const { db, user } = await getAuthUser();

  const song = await db
    .collection("custom_songs")
    .findOne({ _id: new ObjectId(songId) });
  if (!song) throw new Error("Song not found");

  await requireBandMember(db, user._id.toString(), song.bandId);

  const file = formData.get("audio");
  if (!(file instanceof File)) throw new Error("No audio file provided");

  if (!ALLOWED_AUDIO_TYPES.includes(file.type))
    throw new Error("Unsupported audio format");
  if (file.size > MAX_AUDIO_BYTES) throw new Error("File too large — max 8 MB");

  const durationRaw = formData.get("durationSeconds");
  const parsedDuration =
    typeof durationRaw === "string" ? Number(durationRaw) : NaN;
  const duration =
    Number.isFinite(parsedDuration) && parsedDuration > 0
      ? Math.round(parsedDuration)
      : undefined;

  const existingBlobUrl = song.audioBlobUrl as string | undefined;
  if (existingBlobUrl) {
    try {
      await del(existingBlobUrl);
    } catch (blobErr) {
      console.error("Failed to delete existing audio blob:", blobErr);
    }
  }

  const blob = await put(
    buildAudioBlobPath(song.bandId, songId, file.name || "audio-file"),
    file,
    {
      access: "private",
      addRandomSuffix: false,
      contentType: file.type,
    },
  );

  const setFields: Record<string, unknown> = {
    audioBlobUrl: blob.url,
    audioBlobPathname: blob.pathname,
    audioMimeType: file.type,
    hasAudio: true,
    updatedAt: new Date(),
  };
  if (duration !== undefined) setFields.duration = duration;

  await db.collection("custom_songs").updateOne(
    { _id: new ObjectId(songId) },
    {
      $set: setFields,
      $unset: {
        audioData: "",
        audioUrl: "",
      },
    },
  );

  return { audioUrl: `/api/songs/${songId}/audio`, duration };
}

export async function deleteAudioAction(songId: string): Promise<void> {
  if (!ObjectId.isValid(songId)) throw new Error("Song not found");

  const { db, user } = await getAuthUser();

  const song = await db
    .collection("custom_songs")
    .findOne({ _id: new ObjectId(songId) });
  if (!song) throw new Error("Song not found");

  await requireBandMember(db, user._id.toString(), song.bandId);

  const audioBlobUrl = song.audioBlobUrl as string | undefined;
  if (audioBlobUrl) {
    try {
      await del(audioBlobUrl);
    } catch (blobErr) {
      console.error("Failed to delete audio blob:", blobErr);
    }
  }

  await db.collection("custom_songs").updateOne(
    { _id: new ObjectId(songId) },
    {
      $unset: {
        audioBlobUrl: "",
        audioBlobPathname: "",
        audioMimeType: "",
        audioUrl: "",
        audioData: "",
        hasAudio: "",
        duration: "",
      },
      $set: { updatedAt: new Date() },
    },
  );
}

export async function uploadSongImageAction(
  songId: string,
  formData: FormData,
): Promise<{ image: string }> {
  const { db, song } = await requireSongForMember(songId);
  const file = validateImageFile(formData.get("image"));

  await deleteBlobQuietly(song.imageBlobUrl, "song image");

  const blob = await put(
    buildImageBlobPath("songs", song.bandId, songId, file.name || "image"),
    file,
    { access: "private", addRandomSuffix: false, contentType: file.type },
  );

  const image = songImageUrl(songId, Date.now());
  await db.collection("custom_songs").updateOne(
    { _id: new ObjectId(songId) },
    {
      $set: {
        imageBlobUrl: blob.url,
        imageMimeType: file.type,
        image,
        updatedAt: new Date(),
      },
    },
  );

  return { image };
}

export async function deleteSongImageAction(songId: string): Promise<void> {
  const { db, song } = await requireSongForMember(songId);

  await deleteBlobQuietly(song.imageBlobUrl, "song image");

  await db.collection("custom_songs").updateOne(
    { _id: new ObjectId(songId) },
    {
      $unset: { imageBlobUrl: "", imageMimeType: "", image: "" },
      $set: { updatedAt: new Date() },
    },
  );
}

// album images are keyed by band + the album name stored on its songs
export async function uploadAlbumImageAction(
  bandId: string,
  albumName: string,
  formData: FormData,
): Promise<{ image: string }> {
  if (!albumName.trim()) throw new Error("Album name is required");
  const { db, bandObjectId } = await requireBandMemberContext(bandId);
  const file = validateImageFile(formData.get("image"));

  const existing = await db
    .collection("custom_albums")
    .findOne({ bandId: bandObjectId, name: albumName });
  await deleteBlobQuietly(existing?.imageBlobUrl, "album image");

  const albumId = (existing?._id as ObjectId | undefined) ?? new ObjectId();
  const blob = await put(
    buildImageBlobPath(
      "albums",
      bandObjectId,
      albumId.toString(),
      file.name || "image",
    ),
    file,
    { access: "private", addRandomSuffix: false, contentType: file.type },
  );

  const image = albumImageUrl(albumId.toString(), Date.now());
  await db.collection("custom_albums").updateOne(
    { _id: albumId },
    {
      $set: {
        bandId: bandObjectId,
        name: albumName,
        imageBlobUrl: blob.url,
        imageMimeType: file.type,
        image,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  );

  return { image };
}

export async function deleteAlbumImageAction(
  bandId: string,
  albumName: string,
): Promise<void> {
  const { db, bandObjectId } = await requireBandMemberContext(bandId);

  const album = await db
    .collection("custom_albums")
    .findOne({ bandId: bandObjectId, name: albumName });
  if (!album) return;

  await deleteBlobQuietly(album.imageBlobUrl, "album image");
  await db.collection("custom_albums").deleteOne({ _id: album._id });
}

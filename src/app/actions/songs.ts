"use server";

import { getAuthUser } from "@/app/lib/server/auth";
import {
  normaliseSongId,
  requireBandMember,
  requireBandMemberContext,
  toObjectId,
  toObjectIds,
} from "@/app/lib/server/utils";
import {
  albumImageUrl,
  buildImageBlobPath,
  songImageUrl,
  validateImageFile,
} from "@/app/lib/server/customSongImages";
import { deleteBlobsQuietly } from "@/app/lib/server/blobStorage";
import { runAction, UserError } from "@/app/lib/actionResult";
import {
  readOptionalString,
  readString,
  readStringArray,
} from "@/app/lib/validate";
import { put } from "@vercel/blob";
import { ObjectId } from "mongodb";

// loads a custom song and checks the current user is in its band
async function requireSongForMember(songId: unknown) {
  const songObjectId = toObjectId(songId, "song ID");
  const { db, user } = await getAuthUser();

  const song = await db
    .collection("custom_songs")
    .findOne({ _id: songObjectId });
  if (!song) throw new UserError("Song not found");

  await requireBandMember(db, user._id.toString(), song.bandId);
  return { db, song, songObjectId };
}

// not trimmed - album images are matched on the exact name stored on songs
function readAlbumName(album: unknown) {
  return readOptionalString(album, "album", 200) ?? "";
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
  return runAction("Failed to create song", async () => {
    const songTitle = readString(title, "title", 200).trim();
    if (!songTitle) throw new UserError("Title is required");
    const songNotes = readOptionalString(notes, "notes", 5000) ?? "";
    const songAlbum = readAlbumName(album);

    const { db, user, bandObjectId } = await requireBandMemberContext(bandId);

    const now = new Date();
    const result = await db.collection("custom_songs").insertOne({
      bandId: bandObjectId,
      creatorId: user._id,
      title: songTitle,
      notes: songNotes,
      album: songAlbum,
      createdAt: now,
      updatedAt: now,
    });

    return {
      song: {
        _id: result.insertedId.toString(),
        bandId: bandObjectId.toString(),
        creatorId: user._id.toString(),
        title: songTitle,
        notes: songNotes,
        album: songAlbum,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    };
  });
}

export async function deleteSongAction(songId: string) {
  return runAction("Failed to delete song", async () => {
    const { db, song, songObjectId } = await requireSongForMember(songId);

    await deleteBlobsQuietly(
      [song.audioBlobUrl, song.imageBlobUrl],
      "song audio and image",
    );

    const normalisedSongId = normaliseSongId(songObjectId);

    // remove all references to this custom song
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

    await db.collection("custom_songs").deleteOne({ _id: songObjectId });
  });
}

export async function updateSongAction(
  songId: string,
  updates: { title?: string; notes?: string; album?: string },
) {
  return runAction("Failed to update song", async () => {
    const title = readOptionalString(updates?.title, "title", 200)?.trim();
    if (title === "") throw new UserError("Title is required");
    const notes = readOptionalString(updates?.notes, "notes", 5000);
    const album =
      updates?.album === undefined ? undefined : readAlbumName(updates.album);

    const { db, songObjectId } = await requireSongForMember(songId);

    const setFields: Record<string, unknown> = { updatedAt: new Date() };
    if (title !== undefined) setFields.title = title;
    if (notes !== undefined) setFields.notes = notes;
    if (album !== undefined) setFields.album = album;

    await db
      .collection("custom_songs")
      .updateOne({ _id: songObjectId }, { $set: setFields });
  });
}

// saves the order of the songs in one album, from the drag and drop list
export async function reorderAlbumSongsAction(
  bandId: string,
  songIds: string[],
) {
  return runAction("Failed to reorder songs", async () => {
    const ids = toObjectIds(readStringArray(songIds, "songs"));
    const { db, bandObjectId } = await requireBandMemberContext(bandId);

    const bulkOps = ids.map((id, index) => ({
      updateOne: {
        filter: { _id: id, bandId: bandObjectId },
        update: { $set: { order: index } },
      },
    }));

    if (bulkOps.length > 0) {
      await db.collection("custom_songs").bulkWrite(bulkOps);
    }
  });
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

export async function uploadAudioAction(songId: string, formData: FormData) {
  return runAction("Failed to upload audio", async () => {
    const { db, song, songObjectId } = await requireSongForMember(songId);

    const file = formData.get("audio");
    if (!(file instanceof File)) throw new UserError("No audio file provided");

    if (!ALLOWED_AUDIO_TYPES.includes(file.type))
      throw new UserError("Unsupported audio format");
    if (file.size > MAX_AUDIO_BYTES)
      throw new UserError("File too large — max 8 MB");

    const durationRaw = formData.get("durationSeconds");
    const parsedDuration =
      typeof durationRaw === "string" ? Number(durationRaw) : NaN;
    const duration =
      Number.isFinite(parsedDuration) && parsedDuration > 0
        ? Math.round(parsedDuration)
        : undefined;

    await deleteBlobsQuietly(song.audioBlobUrl, "song audio");

    const id = songObjectId.toString();
    const blob = await put(
      buildAudioBlobPath(song.bandId, id, file.name || "audio-file"),
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

    await db
      .collection("custom_songs")
      .updateOne({ _id: songObjectId }, { $set: setFields });

    return { audioUrl: `/api/songs/${id}/audio`, duration };
  });
}

export async function deleteAudioAction(songId: string) {
  return runAction("Failed to remove audio", async () => {
    const { db, song, songObjectId } = await requireSongForMember(songId);

    await deleteBlobsQuietly(song.audioBlobUrl, "song audio");

    await db.collection("custom_songs").updateOne(
      { _id: songObjectId },
      {
        $unset: {
          audioBlobUrl: "",
          audioBlobPathname: "",
          audioMimeType: "",
          hasAudio: "",
          duration: "",
        },
        $set: { updatedAt: new Date() },
      },
    );
  });
}

export async function uploadSongImageAction(
  songId: string,
  formData: FormData,
) {
  return runAction("Failed to upload image", async () => {
    const { db, song, songObjectId } = await requireSongForMember(songId);
    const file = validateImageFile(formData.get("image"));
    const id = songObjectId.toString();

    await deleteBlobsQuietly(song.imageBlobUrl, "song image");

    const blob = await put(
      buildImageBlobPath("songs", song.bandId, id, file.name || "image"),
      file,
      { access: "private", addRandomSuffix: false, contentType: file.type },
    );

    const image = songImageUrl(id, Date.now());
    await db.collection("custom_songs").updateOne(
      { _id: songObjectId },
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
  });
}

export async function deleteSongImageAction(songId: string) {
  return runAction("Failed to remove image", async () => {
    const { db, song, songObjectId } = await requireSongForMember(songId);

    await deleteBlobsQuietly(song.imageBlobUrl, "song image");

    await db.collection("custom_songs").updateOne(
      { _id: songObjectId },
      {
        $unset: { imageBlobUrl: "", imageMimeType: "", image: "" },
        $set: { updatedAt: new Date() },
      },
    );
  });
}

// album images are keyed by band + the album name stored on its songs
export async function uploadAlbumImageAction(
  bandId: string,
  albumName: string,
  formData: FormData,
) {
  return runAction("Failed to upload album image", async () => {
    const name = readAlbumName(albumName);
    if (!name.trim()) throw new UserError("Album name is required");
    const { db, bandObjectId } = await requireBandMemberContext(bandId);
    const file = validateImageFile(formData.get("image"));

    const existing = await db
      .collection("custom_albums")
      .findOne({ bandId: bandObjectId, name });
    await deleteBlobsQuietly(existing?.imageBlobUrl, "album image");

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
          name,
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
  });
}

export async function deleteAlbumImageAction(
  bandId: string,
  albumName: string,
) {
  return runAction("Failed to remove album image", async () => {
    const name = readAlbumName(albumName);
    const { db, bandObjectId } = await requireBandMemberContext(bandId);

    const album = await db
      .collection("custom_albums")
      .findOne({ bandId: bandObjectId, name });
    if (!album) return;

    await deleteBlobsQuietly(album.imageBlobUrl, "album image");
    await db.collection("custom_albums").deleteOne({ _id: album._id });
  });
}

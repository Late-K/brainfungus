import "server-only";

import { Db, ObjectId } from "mongodb";
import { normaliseSongId } from "@/app/lib/server/utils";
import {
  albumImageKey,
  getAlbumImages,
} from "@/app/lib/server/customSongImages";
import { ProfileLearntSong } from "@/app/types";

// fetch all learnt songs for a user from the unified learnt_songs collection
export function getUserLearntSongs(db: Db, userId: ObjectId) {
  return getUserSongs(db, "learnt_songs", userId);
}

// songs the user is still learning, kept the same way as learnt songs
export function getUserLearningSongs(db: Db, userId: ObjectId) {
  return getUserSongs(db, "learning_songs", userId);
}

async function getUserSongs(
  db: Db,
  collection: "learnt_songs" | "learning_songs",
  userId: ObjectId,
): Promise<ProfileLearntSong[]> {
  const learntEntries = await db
    .collection(collection)
    .find({ userId, active: { $ne: false } })
    .sort({ createdAt: 1 })
    .toArray();

  const customSongIds = Array.from(
    new Set(
      learntEntries
        .filter((entry) => entry.isCustom)
        .map((entry) => normaliseSongId(entry.songId))
        .filter((songId) => ObjectId.isValid(songId)),
    ),
  );

  const customSongs = customSongIds.length
    ? await db
        .collection("custom_songs")
        .find(
          {
            _id: { $in: customSongIds.map((id) => new ObjectId(id)) },
          },
          {
            projection: {
              title: 1,
              album: 1,
              duration: 1,
              notes: 1,
              image: 1,
              hasAudio: 1,
              updatedAt: 1,
              bandId: 1,
            },
          },
        )
        .toArray()
    : [];

  const customSongsById = new Map(
    customSongs.map((song) => [song._id.toString(), song]),
  );

  // custom songs without their own image fall back to their album's
  const albumImages = await getAlbumImages(
    db,
    Array.from(
      new Map(
        customSongs
          .filter((song) => song.album && song.bandId)
          .map((song) => [song.bandId.toString(), song.bandId as ObjectId]),
      ).values(),
    ),
  );
  const getCustomSongImage = (song: (typeof customSongs)[number]) =>
    (song.image as string | undefined) ??
    (song.album
      ? albumImages.get(albumImageKey(song.bandId, song.album as string))
      : undefined);

  const bandIds = Array.from(
    new Set(
      learntEntries
        .filter((entry) => entry.bandId)
        .map((entry) => entry.bandId.toString()),
    ),
  );

  const bands = bandIds.length
    ? await db
        .collection("bands")
        .find(
          { _id: { $in: bandIds.map((id) => new ObjectId(id)) } },
          { projection: { name: 1 } },
        )
        .toArray()
    : [];

  const bandNameById = new Map(
    bands.map((band) => [band._id.toString(), band.name as string]),
  );

  const seen = new Set<string>();
  const songs: ProfileLearntSong[] = [];

  for (const entry of learntEntries) {
    const songId = normaliseSongId(entry.songId);
    if (seen.has(songId)) continue;
    seen.add(songId);

    const isCustom = Boolean(entry.isCustom);
    const liveCustomSong = isCustom ? customSongsById.get(songId) : undefined;
    const updatedAtMs =
      liveCustomSong?.updatedAt instanceof Date
        ? liveCustomSong.updatedAt.getTime()
        : undefined;
    const customPreview =
      liveCustomSong?.hasAudio === true
        ? `/api/songs/${songId}/audio${updatedAtMs ? `?v=${updatedAtMs}` : ""}`
        : undefined;
    const resolvedDuration = isCustom
      ? liveCustomSong?.hasAudio === true
        ? (liveCustomSong?.duration as number | undefined)
        : undefined
      : (entry.duration as number | undefined);
    const resolvedPreview = isCustom
      ? customPreview
      : (entry.preview as string | undefined);

    songs.push({
      id: entry._id.toString(),
      songId,
      title:
        (liveCustomSong?.title as string | undefined) ??
        (entry.title as string | undefined) ??
        songId,
      artist: entry.artist as string | undefined,
      album:
        (liveCustomSong?.album as string | undefined) ??
        (entry.album as string | undefined),
      duration: resolvedDuration,
      preview: resolvedPreview,
      image:
        (liveCustomSong ? getCustomSongImage(liveCustomSong) : undefined) ??
        (entry.image as string | undefined),
      notes:
        (liveCustomSong?.notes as string | undefined) ??
        (entry.notes as string | undefined),
      isCustom,
      bandId: entry.bandId?.toString(),
      bandName:
        bandNameById.get(entry.bandId?.toString() ?? "") ??
        (entry.bandName as string | undefined),
      source: entry.bandId ? "band" : "personal",
      createdAt: entry.createdAt?.toISOString?.() ?? new Date().toISOString(),
    });
  }

  return songs;
}

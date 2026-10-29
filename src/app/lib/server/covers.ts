import "server-only";

import { Db, ObjectId } from "mongodb";
import { BandCover } from "@/app/types";
import { getSetlistSongEnricher } from "@/app/lib/server/setlists";

// a band's covers, oldest first. most are deezer songs saved with their
// details, but they can also be other bands' custom songs, stored as just
// their id like in setlists and filled in here - ones since deleted or made
// private are left out
export async function getBandCovers(
  db: Db,
  bandId: ObjectId,
): Promise<BandCover[]> {
  const covers = await db
    .collection("covers")
    .find({ bandId })
    .sort({ createdAt: 1 })
    .toArray();

  const customSongs = covers
    .filter((cover) => cover.isCustom)
    .map((cover) => ({ id: cover.songId, isCustom: true }));
  const enrich = await getSetlistSongEnricher(db, bandId, customSongs);
  const customById = new Map(
    enrich(customSongs)
      .map((song) => song as Record<string, unknown>)
      // a band's own songs aren't covers
      .filter((song) => song.bandId !== bandId.toString())
      .map((song) => [song.id as string, song]),
  );

  const toIso = (value: unknown) =>
    value instanceof Date ? value.toISOString() : (value as string);

  return covers.flatMap((cover): BandCover[] => {
    const base = {
      _id: cover._id.toString(),
      songId: cover.songId as string,
      createdAt: toIso(cover.createdAt),
      updatedAt: toIso(cover.updatedAt),
    };
    if (!cover.isCustom) {
      return [
        {
          ...base,
          title: cover.title,
          artist: cover.artist,
          album: cover.album,
          duration: cover.duration,
          preview: cover.preview,
          image: cover.image,
        },
      ];
    }

    const song = customById.get(base.songId);
    if (!song) return [];
    return [
      {
        ...base,
        title: (song.title as string | undefined) ?? "",
        // the band the song is by
        artist: (song.artist as string | undefined) ?? "",
        album: song.album as string | undefined,
        duration: (song.duration as number | undefined) ?? 0,
        preview: song.audioUrl as string | undefined,
        image: song.image as string | undefined,
        isCustom: true,
        songBandId: song.bandId as string,
      },
    ];
  });
}

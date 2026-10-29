import "server-only";

import { Db, ObjectId } from "mongodb";
import { normaliseSongId, toObjectIds } from "@/app/lib/server/utils";
import {
  albumImageKey,
  getAlbumImages,
} from "@/app/lib/server/customSongImages";
import { getSongBands } from "@/app/lib/server/customSongAccess";

type StoredSetlistSong = {
  id: unknown;
  isCustom?: boolean;
  title?: string;
  album?: string;
  duration?: number;
  [key: string]: unknown;
};

// custom songs are stored in setlists as just their id, so their current
// title, album, length, audio and image are looked up when a setlist is read.
// they can be the band's own songs or another band's. ones that have been
// deleted, or whose band has since made its songs private, are left out.
// returns a function that fills in a list of stored setlist songs
export async function getSetlistSongEnricher(
  db: Db,
  bandId: ObjectId,
  songs: StoredSetlistSong[],
) {
  const customIds = toObjectIds([
    ...new Set(
      songs.filter((s) => s.isCustom).map((s) => normaliseSongId(s.id)),
    ),
  ]);

  const customDocs =
    customIds.length > 0
      ? await db
          .collection("custom_songs")
          .find(
            { _id: { $in: customIds } },
            {
              projection: {
                bandId: 1,
                title: 1,
                album: 1,
                hasAudio: 1,
                duration: 1,
                image: 1,
              },
            },
          )
          .toArray()
      : [];

  const songBandIds = [
    ...new Map(
      customDocs.map((doc) => [doc.bandId.toString(), doc.bandId as ObjectId]),
    ).values(),
  ];
  const [otherBands, albumImages] = await Promise.all([
    getSongBands(db, songBandIds.filter((id) => !id.equals(bandId))),
    getAlbumImages(db, songBandIds),
  ]);

  const customMap = new Map(customDocs.map((doc) => [doc._id.toString(), doc]));

  const enrich = (song: StoredSetlistSong) => {
    const id = normaliseSongId(song.id);
    if (!song.isCustom) return [{ ...song, id }];

    const doc = customMap.get(id);
    if (!doc) return [];

    // another band's song shows that band as its artist
    const isOwnSong = (doc.bandId as ObjectId).equals(bandId);
    const otherBand = isOwnSong
      ? undefined
      : otherBands.get(doc.bandId.toString());
    if (!isOwnSong && (!otherBand || otherBand.isPrivate)) return [];

    const album = (doc.album as string | undefined) ?? song.album;
    return [
      {
        ...song,
        id,
        bandId: doc.bandId.toString(),
        title: (doc.title as string | undefined) ?? song.title,
        artist: otherBand?.name,
        album,
        audioUrl: doc.hasAudio ? `/api/songs/${id}/audio` : undefined,
        duration:
          typeof doc.duration === "number" && Number.isFinite(doc.duration)
            ? doc.duration
            : song.duration,
        // own image first, then the album's
        image:
          (doc.image as string | undefined) ??
          (album
            ? albumImages.get(albumImageKey(doc.bandId, album))
            : undefined),
      },
    ];
  };

  return (setlistSongs: StoredSetlistSong[]) => setlistSongs.flatMap(enrich);
}

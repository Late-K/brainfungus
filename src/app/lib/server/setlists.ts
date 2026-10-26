import "server-only";

import { Db, ObjectId } from "mongodb";
import { normaliseSongId, toObjectIds } from "@/app/lib/server/utils";
import {
  albumImageKey,
  getAlbumImages,
} from "@/app/lib/server/customSongImages";

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
// returns a function that fills in one stored setlist song
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

  const [customDocs, albumImages] =
    customIds.length > 0
      ? await Promise.all([
          db
            .collection("custom_songs")
            .find(
              { _id: { $in: customIds } },
              {
                projection: {
                  title: 1,
                  album: 1,
                  hasAudio: 1,
                  duration: 1,
                  image: 1,
                },
              },
            )
            .toArray(),
          getAlbumImages(db, [bandId]),
        ])
      : [[], new Map<string, string>()];

  const customMap = new Map(customDocs.map((doc) => [doc._id.toString(), doc]));

  return (song: StoredSetlistSong) => {
    const id = normaliseSongId(song.id);
    const doc = song.isCustom ? customMap.get(id) : undefined;
    if (!doc) return { ...song, id };

    const album = (doc.album as string | undefined) ?? song.album;
    return {
      ...song,
      id,
      title: (doc.title as string | undefined) ?? song.title,
      album,
      audioUrl: doc.hasAudio ? `/api/songs/${id}/audio` : undefined,
      duration:
        typeof doc.duration === "number" && Number.isFinite(doc.duration)
          ? doc.duration
          : song.duration,
      // own image first, then the album's
      image:
        (doc.image as string | undefined) ??
        (album ? albumImages.get(albumImageKey(bandId, album)) : undefined),
    };
  };
}

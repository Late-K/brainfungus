import "server-only";

// custom songs belong to one band. unless the band has made them private,
// anyone signed in can play them (from members' profiles) and members can add
// them to their other bands' setlists. private ones only exist for the band's
// own members

import { Db, ObjectId } from "mongodb";
import { isBandMember, toObjectIds } from "@/app/lib/server/utils";

type SongBand = { name: string; isPrivate: boolean };

// name and privacy of each of the given bands that still exists
export async function getSongBands(
  db: Db,
  bandIds: ObjectId[],
): Promise<Map<string, SongBand>> {
  if (bandIds.length === 0) return new Map();

  const bands = await db
    .collection("bands")
    .find(
      { _id: { $in: bandIds } },
      { projection: { name: 1, customSongsPrivate: 1 } },
    )
    .toArray();

  return new Map(
    bands.map((band) => [
      band._id.toString(),
      {
        name: band.name as string,
        isPrivate: band.customSongsPrivate === true,
      },
    ]),
  );
}

// whether a user can play or see the custom songs of a band
export async function canAccessBandSongs(
  db: Db,
  userId: string,
  bandId: unknown,
) {
  if (!(bandId instanceof ObjectId)) return false;
  const band = await db
    .collection("bands")
    .findOne(
      { _id: bandId },
      { projection: { members: 1, customSongsPrivate: 1 } },
    );
  if (!band) return false;
  return band.customSongsPrivate !== true || isBandMember(band, userId);
}

// the custom songs out of those given that can go in one of a band's
// setlists - its own songs, and other bands' songs that aren't private.
// a band's covers can only have other bands' songs, so leave out its own
// with allowOwnBand false
export async function getSetlistableCustomSongIds(
  db: Db,
  bandId: ObjectId,
  songIds: string[],
  { allowOwnBand = true }: { allowOwnBand?: boolean } = {},
): Promise<Set<string>> {
  const objectIds = toObjectIds([...new Set(songIds)]);
  if (objectIds.length === 0) return new Set();

  const songs = await db
    .collection("custom_songs")
    .find({ _id: { $in: objectIds } }, { projection: { bandId: 1 } })
    .toArray();

  const otherBandIds = songs
    .map((song) => song.bandId as ObjectId)
    .filter((id) => !id.equals(bandId));
  const songBands = await getSongBands(db, otherBandIds);

  return new Set(
    songs
      .filter((song) => {
        if ((song.bandId as ObjectId).equals(bandId)) return allowOwnBand;
        const songBand = songBands.get(song.bandId.toString());
        return songBand !== undefined && !songBand.isPrivate;
      })
      .map((song) => song._id.toString()),
  );
}

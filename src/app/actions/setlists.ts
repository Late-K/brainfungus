"use server";

import { getAuthUser } from "@/app/lib/server/auth";
import {
  normaliseSongId,
  requireBandMember,
  requireBandMemberContext,
  toObjectId,
} from "@/app/lib/server/utils";
import { Db, Document, ObjectId } from "mongodb";
import { Song } from "@/app/types";
import { toSetlistSong } from "@/app/lib/setlistUtils";
import { notifyBandMembers } from "@/app/lib/server/push";
import { runAction, UserError } from "@/app/lib/actionResult";
import { readSongInput, readString } from "@/app/lib/validate";

// tell the rest of the band their active setlist changed.
// one tag per band so a burst of edits replaces the previous notification
function notifyActiveSetlistChange(
  db: Db,
  band: Document,
  user: Document,
  setlistId: string,
  body: string,
) {
  const bandId = band._id.toString();
  notifyBandMembers(db, band, user._id.toString(), "setlists", {
    title: band.name,
    body: `${user.name || "Someone"} ${body}`,
    url: `/bands/${bandId}/setlists/${setlistId}`,
    tag: `setlist-${bandId}`,
  });
}

function readSetlistName(name: unknown) {
  const trimmed = readString(name, "setlist name", 200).trim();
  if (!trimmed) throw new UserError("Setlist name is required");
  return trimmed;
}

function readSetlistSongs(songs: unknown) {
  if (!Array.isArray(songs) || songs.length > 500) {
    throw new UserError("Invalid songs");
  }
  return songs.map((song) => toSetlistSong(readSongInput(song)));
}

// loads a setlist and checks the current user is in its band
async function requireSetlist(setlistId: unknown) {
  const setlistObjectId = toObjectId(setlistId, "setlist ID");
  const { db, user } = await getAuthUser();

  const setlist = await db
    .collection("setlists")
    .findOne({ _id: setlistObjectId });
  if (!setlist) throw new UserError("Setlist not found");

  const { band } = await requireBandMember(
    db,
    user._id.toString(),
    setlist.bandId,
  );
  return { db, user, band, setlist };
}

export async function createSetlistAction(
  bandId: string,
  name: string,
  songs: Song[],
) {
  return runAction("Failed to create setlist", async () => {
    const setlistName = readSetlistName(name);
    const setlistSongs = readSetlistSongs(songs);
    const { db, user, band, bandObjectId } =
      await requireBandMemberContext(bandId);

    // deactivate any currently active setlist for this band
    await db
      .collection("setlists")
      .updateMany(
        { bandId: bandObjectId, isActive: true },
        { $set: { isActive: false, updatedAt: new Date() } },
      );

    const result = await db.collection("setlists").insertOne({
      bandId: bandObjectId,
      creatorId: user._id,
      name: setlistName,
      songs: setlistSongs,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    notifyActiveSetlistChange(
      db,
      band,
      user,
      result.insertedId.toString(),
      `made a new active setlist: ${setlistName}`,
    );

    return { setlistId: result.insertedId.toString() };
  });
}

export async function deleteSetlistAction(setlistId: string) {
  return runAction("Failed to delete setlist", async () => {
    const { db, user, setlist } = await requireSetlist(setlistId);

    if (setlist.creatorId.toString() !== user._id.toString()) {
      throw new UserError(
        "Only the person who made this setlist can delete it",
      );
    }

    await db.collection("setlists").deleteOne({ _id: setlist._id });
  });
}

export async function setActiveSetlistAction(
  bandId: string,
  setlistId: string,
) {
  return runAction("Failed to set active setlist", async () => {
    const setlistObjectId = toObjectId(setlistId, "setlist ID");
    const { db, user, band, bandObjectId } =
      await requireBandMemberContext(bandId);

    // deactivate all other setlists in this band
    await db
      .collection("setlists")
      .updateMany({ bandId: bandObjectId }, { $set: { isActive: false } });

    // activate the selected setlist
    const setlist = await db
      .collection("setlists")
      .findOneAndUpdate(
        { _id: setlistObjectId, bandId: bandObjectId },
        { $set: { isActive: true, updatedAt: new Date() } },
      );

    if (!setlist) {
      throw new UserError("Setlist not found");
    }

    notifyActiveSetlistChange(
      db,
      band,
      user,
      setlistObjectId.toString(),
      `set the active setlist to ${setlist.name}`,
    );
  });
}

export async function updateSetlistAction(
  setlistId: string,
  name: string,
  songs: Song[],
) {
  return runAction("Failed to update setlist", async () => {
    const setlistName = readSetlistName(name);
    const setlistSongs = readSetlistSongs(songs);
    const { db, user, band, setlist } = await requireSetlist(setlistId);

    await db.collection("setlists").updateOne(
      { _id: setlist._id },
      {
        $set: {
          name: setlistName,
          songs: setlistSongs,
          updatedAt: new Date(),
        },
      },
    );

    if (setlist.isActive) {
      notifyActiveSetlistChange(
        db,
        band,
        user,
        setlist._id.toString(),
        `updated the active setlist ${setlistName}`,
      );
    }
  });
}

export async function deactivateSetlistAction(
  bandId: string,
  setlistId: string,
) {
  return runAction("Failed to deactivate setlist", async () => {
    const setlistObjectId = toObjectId(setlistId, "setlist ID");
    const { db, bandObjectId } = await requireBandMemberContext(bandId);

    const result = await db
      .collection("setlists")
      .updateOne(
        { _id: setlistObjectId, bandId: bandObjectId },
        { $set: { isActive: false, updatedAt: new Date() } },
      );

    if (result.matchedCount === 0) {
      throw new UserError("Setlist not found");
    }
  });
}

// add a single song to the band's active setlist (used from covers and custom songs lists)
export async function addSongToActiveSetlistAction(bandId: string, song: Song) {
  return runAction("Failed to add song to setlist", async () => {
    const input = readSongInput(song);
    const { db, user, band, bandObjectId } =
      await requireBandMemberContext(bandId);

    const setlist = await db
      .collection("setlists")
      .findOne({ bandId: bandObjectId, isActive: true });
    if (!setlist) throw new UserError("No active setlist");

    // custom songs must belong to this band
    if (input.isCustom) {
      if (!ObjectId.isValid(input.id)) throw new UserError("Song not found");
      const customSong = await db
        .collection("custom_songs")
        .findOne({ _id: new ObjectId(input.id), bandId: bandObjectId });
      if (!customSong) throw new UserError("Song not found");
    }

    const existingSongs: Array<{ id: unknown }> = setlist.songs || [];
    if (existingSongs.some((s) => normaliseSongId(s.id) === input.id)) {
      return { alreadyExists: true, setlistId: setlist._id.toString() };
    }

    await db.collection("setlists").updateOne({ _id: setlist._id }, {
      $push: { songs: toSetlistSong(input) },
      $set: { updatedAt: new Date() },
    } as Record<string, unknown>);

    notifyActiveSetlistChange(
      db,
      band,
      user,
      setlist._id.toString(),
      `added ${input.title} to ${setlist.name}`,
    );

    return { alreadyExists: false, setlistId: setlist._id.toString() };
  });
}

export async function removeSongFromActiveSetlistAction(
  bandId: string,
  songId: string,
) {
  return runAction("Failed to remove song from setlist", async () => {
    const id = readString(songId, "song", 100);
    const { db, user, band, bandObjectId } =
      await requireBandMemberContext(bandId);

    // returns the setlist from before the pull, so the removed song's title is still there
    const setlist = await db
      .collection("setlists")
      .findOneAndUpdate({ bandId: bandObjectId, isActive: true }, {
        $pull: { songs: { id } },
        $set: { updatedAt: new Date() },
      } as Record<string, unknown>);

    if (!setlist) throw new UserError("No active setlist");

    const removedSong = (
      (setlist.songs ?? []) as Array<{ id: unknown; title?: string }>
    ).find((s) => normaliseSongId(s.id) === id);
    if (removedSong) {
      notifyActiveSetlistChange(
        db,
        band,
        user,
        setlist._id.toString(),
        `removed ${removedSong.title || "a song"} from ${setlist.name}`,
      );
    }
  });
}

import { getAuthUser } from "@/app/lib/server/auth";
import { normaliseSongId, serverErrorResponse } from "@/app/lib/server/utils";
import { UserSonglistBand } from "@/app/types";
import { NextResponse } from "next/server";
import { Document, ObjectId } from "mongodb";

// every band the current user is in with its covers and setlists, for adding
// songs to them from any song list
export async function GET() {
  try {
    const { db, user } = await getAuthUser();

    const bands = await db
      .collection("bands")
      .find(
        { "members.userId": user._id.toString() },
        { projection: { name: 1, image: 1 } },
      )
      .sort({ name: 1 })
      .toArray();
    const bandIds = bands.map((band) => band._id);

    const [setlists, covers] =
      bandIds.length > 0
        ? await Promise.all([
            db
              .collection("setlists")
              .find(
                { bandId: { $in: bandIds } },
                {
                  projection: {
                    bandId: 1,
                    name: 1,
                    isActive: 1,
                    "songs.id": 1,
                  },
                },
              )
              .sort({ isActive: -1, createdAt: -1 })
              .toArray(),
            db
              .collection("covers")
              .find(
                { bandId: { $in: bandIds } },
                { projection: { bandId: 1, songId: 1 } },
              )
              .toArray(),
          ])
        : [[], []];

    const result: UserSonglistBand[] = bands.map((band) => {
      const isBand = (doc: Document) =>
        (doc.bandId as ObjectId).equals(band._id);
      return {
        _id: band._id.toString(),
        name: band.name as string,
        image: band.image as string | undefined,
        coverSongIds: covers
          .filter(isBand)
          .map((cover) => normaliseSongId(cover.songId)),
        setlists: setlists.filter(isBand).map((setlist) => ({
          _id: setlist._id.toString(),
          name: setlist.name as string,
          isActive: setlist.isActive === true,
          songIds: ((setlist.songs ?? []) as Array<{ id: unknown }>).map(
            (song) => normaliseSongId(song.id),
          ),
        })),
      };
    });

    return NextResponse.json({ bands: result }, { status: 200 });
  } catch (error) {
    return serverErrorResponse(error, "Failed to fetch song lists");
  }
}

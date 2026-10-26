import { getAuthUser } from "@/app/lib/server/auth";
import { serverErrorResponse } from "@/app/lib/server/utils";
import { NextResponse } from "next/server";

// fetch the band invites the current user hasn't answered yet
export async function GET() {
  try {
    const { db, user } = await getAuthUser();

    const invites = await db
      .collection("band_invites")
      .find({ userId: user._id })
      .sort({ createdAt: -1 })
      .toArray();

    if (invites.length === 0) {
      return NextResponse.json({ invites: [] }, { status: 200 });
    }

    // the private blob url stays on the server - images are served by /api/bands/[id]/image
    const [bands, inviters] = await Promise.all([
      db
        .collection("bands")
        .find({ _id: { $in: invites.map((i) => i.bandId) } })
        .project({ name: 1, description: 1, image: 1, members: 1 })
        .toArray(),
      db
        .collection("users")
        .find({ _id: { $in: invites.map((i) => i.invitedBy) } })
        .project({ name: 1 })
        .toArray(),
    ]);

    const bandMap = new Map(bands.map((b) => [b._id.toString(), b]));
    const inviterMap = new Map(inviters.map((u) => [u._id.toString(), u]));

    return NextResponse.json(
      {
        invites: invites.flatMap((invite) => {
          const band = bandMap.get(invite.bandId.toString());
          if (!band) return [];
          return [
            {
              _id: invite._id.toString(),
              bandId: band._id.toString(),
              bandName: band.name,
              bandDescription: band.description ?? "",
              bandImage: band.image,
              memberCount: band.members?.length ?? 0,
              invitedByName:
                inviterMap.get(invite.invitedBy.toString())?.name ??
                "Someone",
              createdAt: invite.createdAt,
            },
          ];
        }),
      },
      { status: 200 },
    );
  } catch (error) {
    return serverErrorResponse(error, "Failed to fetch invites");
  }
}

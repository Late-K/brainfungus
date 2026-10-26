import {
  requireBandMemberContext,
  serverErrorResponse,
  toObjectIds,
} from "@/app/lib/server/utils";
import { NextRequest, NextResponse } from "next/server";

// fetch a specific band with members
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    // the private blob url stays on the server - the image is served by /api/bands/[id]/image
    const {
      db,
      bandObjectId,
      band: { imageBlobUrl: _blobUrl, imageMimeType: _mimeType, ...band },
    } = await requireBandMemberContext(id);

    const memberEntries =
      (band.members as Array<{ userId: string; role: string }>) ?? [];
    const memberObjectIds = toObjectIds(memberEntries.map((m) => m.userId));

    const invites = await db
      .collection("band_invites")
      .find({ bandId: bandObjectId })
      .sort({ createdAt: 1 })
      .toArray();

    const users = await db
      .collection("users")
      .find({
        _id: { $in: [...memberObjectIds, ...invites.map((i) => i.userId)] },
      })
      .toArray();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    return NextResponse.json(
      {
        band: {
          ...band,
          members: memberEntries.map((entry) => {
            const u = userMap.get(entry.userId);
            return {
              id: entry.userId,
              email: u?.email ?? "",
              name: u?.name ?? entry.userId,
              image: u?.image,
              role: entry.role,
              isAdmin: entry.role === "admin" || entry.role === "creator",
              isCreator: entry.role === "creator",
            };
          }),
          // invitees aren't members yet, so only their name and picture
          invites: invites.flatMap((invite) => {
            const u = userMap.get(invite.userId.toString());
            if (!u) return [];
            return [
              {
                id: invite.userId.toString(),
                name: u.name,
                image: u.image,
                invitedAt: invite.createdAt,
              },
            ];
          }),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return serverErrorResponse(error, "Failed to fetch band");
  }
}

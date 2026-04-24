import {
  COLLECTIONS,
  getServerErrorStatus,
  requireBandMemberContext,
} from "@/app/lib/serverData";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// GET - fetch a specific band with members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { db, band } = await requireBandMemberContext(id);

    // fetch member details
    const memberIds = band.memberIds
      .filter((memberId: string) => ObjectId.isValid(memberId))
      .map((memberId: string) => new ObjectId(memberId));
    const members = await db
      .collection(COLLECTIONS.users)
      .find({ _id: { $in: memberIds } })
      .toArray();

    const adminIds: string[] = band.adminIds ?? [];
    const creatorId = band.creatorId?.toString();

    return NextResponse.json(
      {
        band: {
          ...band,
          members: members.map((m) => ({
            id: m._id.toString(),
            email: m.email,
            name: m.name,
            image: m.image,
            isAdmin:
              adminIds.includes(m._id.toString()) ||
              m._id.toString() === creatorId,
            isCreator: m._id.toString() === creatorId,
          })),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching band:", error);
    const status = getServerErrorStatus(error);
    return NextResponse.json(
      {
        error:
          status === 500 ? "Failed to fetch band" : (error as Error).message,
      },
      { status },
    );
  }
}

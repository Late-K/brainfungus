import {
  getServerErrorStatus,
  requireBandMemberContext,
} from "@/app/lib/serverUtils";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// fetch a specific band with members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { db, band } = await requireBandMemberContext(id);

    const memberEntries =
      (band.members as Array<{ userId: string; role: string }>) ?? [];
    const memberObjectIds = memberEntries
      .map((m) => m.userId)
      .filter((uid) => ObjectId.isValid(uid))
      .map((uid) => new ObjectId(uid));

    const users = await db
      .collection("users")
      .find({ _id: { $in: memberObjectIds } })
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

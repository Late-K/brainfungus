import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { getDb } from "@/app/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// GET - fetch a specific band with members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const db = await getDb();

    const band = await db
      .collection("bands")
      .findOne({ _id: new ObjectId(id) });

    if (!band) {
      return NextResponse.json({ error: "Band not found" }, { status: 404 });
    }

    // get current users ID
    const currentUser = await db
      .collection("users")
      .findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // check if user is a member of this band
    if (!band.memberIds.includes(currentUser._id.toString())) {
      return NextResponse.json(
        { error: "Not a member of this band" },
        { status: 403 },
      );
    }

    // fetch member details
    const memberIds = band.memberIds.map((id: string) => new ObjectId(id));
    const members = await db
      .collection("users")
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
    return NextResponse.json(
      { error: "Failed to fetch band" },
      { status: 500 },
    );
  }
}

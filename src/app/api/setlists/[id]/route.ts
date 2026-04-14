import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { getDb } from "@/app/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// GET - fetch a single setlist
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

    const setlist = await db
      .collection("setlists")
      .findOne({ _id: new ObjectId(id) });
    if (!setlist) {
      return NextResponse.json({ error: "Setlist not found" }, { status: 404 });
    }

    const currentUser = await db
      .collection("users")
      .findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const band = await db.collection("bands").findOne({ _id: setlist.bandId });
    if (!band || !band.memberIds.includes(currentUser._id.toString())) {
      return NextResponse.json(
        { error: "Not a member of this band" },
        { status: 403 },
      );
    }

    return NextResponse.json({ setlist }, { status: 200 });
  } catch (error) {
    console.error("Error fetching setlist:", error);
    return NextResponse.json(
      { error: "Failed to fetch setlist" },
      { status: 500 },
    );
  }
}

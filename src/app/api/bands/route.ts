import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { getDb } from "@/app/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

// GET - fetch bands for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();

    // get the current users ID
    const user = await db
      .collection("users")
      .findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // fetch all bands where the user is a member
    const userBands = await db
      .collection("bands")
      .find({ memberIds: user._id.toString() })
      .toArray();

    return NextResponse.json({ bands: userBands }, { status: 200 });
  } catch (error) {
    console.error("Error fetching bands:", error);
    return NextResponse.json(
      { error: "Failed to fetch bands" },
      { status: 500 },
    );
  }
}

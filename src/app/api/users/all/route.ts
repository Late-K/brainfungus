import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { getDb } from "@/app/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

// GET - fetch all users (for band member selection)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();

    // fetch all users except the current user
    const allUsers = await db
      .collection("users")
      .find({ email: { $ne: session.user.email } })
      .project({ email: 1, name: 1, image: 1 })
      .toArray();

    return NextResponse.json({ users: allUsers }, { status: 200 });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}

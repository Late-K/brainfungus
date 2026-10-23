import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { getDb } from "@/app/lib/mongodb";
import { getUserLearntSongs } from "@/app/lib/learntSongsUtils";
import { NextResponse } from "next/server";

// fetch all learnt songs for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();

    const currentUser = await db
      .collection("users")
      .findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const songs = await getUserLearntSongs(db, currentUser._id);

    return NextResponse.json({ songs }, { status: 200 });
  } catch (error) {
    console.error("Error fetching profile learnt songs:", error);
    return NextResponse.json(
      { error: "Failed to fetch learnt songs" },
      { status: 500 },
    );
  }
}

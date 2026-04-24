import { getAuthUser } from "@/app/lib/auth";
import { COLLECTIONS, getServerErrorStatus } from "@/app/lib/serverData";
import { NextResponse } from "next/server";

// GET - fetch all users (for band member selection)
export async function GET() {
  try {
    const { db, user } = await getAuthUser();

    // fetch all users except the current user
    const allUsers = await db
      .collection(COLLECTIONS.users)
      .find({ email: { $ne: user.email } })
      .project({ email: 1, name: 1, image: 1 })
      .toArray();

    return NextResponse.json({ users: allUsers }, { status: 200 });
  } catch (error) {
    console.error("Error fetching users:", error);
    const status = getServerErrorStatus(error);
    return NextResponse.json(
      {
        error:
          status === 500 ? "Failed to fetch users" : (error as Error).message,
      },
      { status },
    );
  }
}

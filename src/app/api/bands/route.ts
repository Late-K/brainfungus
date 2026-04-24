import { getAuthUser } from "@/app/lib/auth";
import { COLLECTIONS, getServerErrorStatus } from "@/app/lib/serverData";
import { NextResponse } from "next/server";

// GET - fetch bands for the current user
export async function GET() {
  try {
    const { db, user } = await getAuthUser();

    // fetch all bands where the user is a member
    const userBands = await db
      .collection(COLLECTIONS.bands)
      .find({ memberIds: user._id.toString() })
      .toArray();

    return NextResponse.json({ bands: userBands }, { status: 200 });
  } catch (error) {
    console.error("Error fetching bands:", error);
    const status = getServerErrorStatus(error);
    return NextResponse.json(
      {
        error:
          status === 500 ? "Failed to fetch bands" : (error as Error).message,
      },
      { status },
    );
  }
}

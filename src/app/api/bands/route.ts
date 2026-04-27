import { getAuthUser } from "@/app/lib/auth";
import { getServerErrorStatus } from "@/app/lib/serverUtils";
import { NextResponse } from "next/server";

// fetch bands for the current user
export async function GET() {
  try {
    const { db, user } = await getAuthUser();

    const userId = user._id.toString();

    // fetch all bands where the user is a member (supports both old and new schema)
    const userBands = await db
      .collection("bands")
      .find({
        $or: [
          { "members.userId": userId },
          { memberIds: userId },
          { creatorId: user._id },
        ],
      })
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

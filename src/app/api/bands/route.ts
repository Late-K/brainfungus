import { getAuthUser } from "@/app/lib/server/auth";
import { serverErrorResponse } from "@/app/lib/server/utils";
import { NextResponse } from "next/server";

// fetch bands for the current user
export async function GET() {
  try {
    const { db, user } = await getAuthUser();

    const userId = user._id.toString();

    // the private blob url stays on the server - images are served by /api/bands/[id]/image
    const userBands = await db
      .collection("bands")
      .find({ "members.userId": userId })
      .project({ imageBlobUrl: 0, imageMimeType: 0 })
      .toArray();

    return NextResponse.json({ bands: userBands }, { status: 200 });
  } catch (error) {
    return serverErrorResponse(error, "Failed to fetch bands");
  }
}

import { getAuthUser } from "@/app/lib/server/auth";
import { serverErrorResponse } from "@/app/lib/server/utils";
import { getUserLearningSongs } from "@/app/lib/server/learntSongs";
import { NextResponse } from "next/server";

// fetch all songs the current user is learning
export async function GET() {
  try {
    const { db, user } = await getAuthUser();
    const songs = await getUserLearningSongs(db, user._id);
    return NextResponse.json({ songs }, { status: 200 });
  } catch (error) {
    return serverErrorResponse(error, "Failed to fetch learning songs");
  }
}

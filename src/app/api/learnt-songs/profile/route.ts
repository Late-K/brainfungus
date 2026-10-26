import { getAuthUser } from "@/app/lib/server/auth";
import { serverErrorResponse } from "@/app/lib/server/utils";
import { getUserLearntSongs } from "@/app/lib/server/learntSongs";
import { NextResponse } from "next/server";

// fetch all learnt songs for the current user
export async function GET() {
  try {
    const { db, user } = await getAuthUser();
    const songs = await getUserLearntSongs(db, user._id);
    return NextResponse.json({ songs }, { status: 200 });
  } catch (error) {
    return serverErrorResponse(error, "Failed to fetch learnt songs");
  }
}

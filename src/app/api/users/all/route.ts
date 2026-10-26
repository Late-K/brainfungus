import { getAuthUser } from "@/app/lib/server/auth";
import { serverErrorResponse } from "@/app/lib/server/utils";
import { NextResponse } from "next/server";

// fetch all users (for band member selection and find people).
// only names and pictures - anyone can sign in, so emails stay private
export async function GET() {
  try {
    const { db, user } = await getAuthUser();

    const allUsers = await db
      .collection("users")
      .find({ _id: { $ne: user._id } })
      .project({ name: 1, image: 1 })
      .toArray();

    return NextResponse.json({ users: allUsers }, { status: 200 });
  } catch (error) {
    return serverErrorResponse(error, "Failed to fetch users");
  }
}

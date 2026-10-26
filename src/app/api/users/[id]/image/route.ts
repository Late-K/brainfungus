import { getAuthUser } from "@/app/lib/server/auth";
import { serverErrorResponse } from "@/app/lib/server/utils";
import { streamBlobImage } from "@/app/lib/server/customSongImages";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// a user's custom profile picture. any signed in user can view it, since
// pictures show up in find people, chat and band member lists
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db } = await getAuthUser();
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const user = await db
      .collection("users")
      .findOne(
        { _id: new ObjectId(id) },
        { projection: { imageBlobUrl: 1, imageMimeType: 1 } },
      );

    const blobUrl = user?.imageBlobUrl as string | undefined;
    if (!blobUrl) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    return streamBlobImage(blobUrl, user?.imageMimeType as string | undefined);
  } catch (error) {
    return serverErrorResponse(error, "Failed to load image");
  }
}

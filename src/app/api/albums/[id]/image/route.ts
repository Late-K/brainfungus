import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { getDb } from "@/app/lib/mongodb";
import { streamBlobImage } from "@/app/lib/customSongImages";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// custom album image, viewable by any signed in user like song images
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const db = await getDb();
    const album = await db
      .collection("custom_albums")
      .findOne(
        { _id: new ObjectId(id) },
        { projection: { imageBlobUrl: 1, imageMimeType: 1 } },
      );

    const blobUrl = album?.imageBlobUrl as string | undefined;
    if (!blobUrl) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    return streamBlobImage(blobUrl, album?.imageMimeType as string | undefined);
  } catch (error) {
    console.error("Error streaming album image:", error);
    return NextResponse.json(
      { error: "Failed to load image" },
      { status: 500 },
    );
  }
}

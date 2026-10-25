import {
  getServerErrorStatus,
  requireBandMemberContext,
} from "@/app/lib/serverUtils";
import { streamBlobImage } from "@/app/lib/customSongImages";
import { NextRequest, NextResponse } from "next/server";

// band image, only viewable by members of the band
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { band } = await requireBandMemberContext(id);

    const blobUrl = band.imageBlobUrl as string | undefined;
    if (!blobUrl) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    return streamBlobImage(blobUrl, band.imageMimeType as string | undefined);
  } catch (error) {
    console.error("Error streaming band image:", error);
    const status = getServerErrorStatus(error);
    return NextResponse.json(
      {
        error:
          status === 500 ? "Failed to load image" : (error as Error).message,
      },
      { status },
    );
  }
}

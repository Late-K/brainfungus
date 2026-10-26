import { getAuthUser } from "@/app/lib/server/auth";
import { UserError } from "@/app/lib/actionResult";
import {
  serverErrorResponse,
  isBandMember,
  toObjectId,
} from "@/app/lib/server/utils";
import { streamBlobImage } from "@/app/lib/server/customSongImages";
import { NextRequest, NextResponse } from "next/server";

// band image, only viewable by members of the band and people invited to it
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const bandObjectId = toObjectId(id, "band ID");
    const { db, user } = await getAuthUser();

    const band = await db.collection("bands").findOne({ _id: bandObjectId });
    if (!band) throw new UserError("Band not found");

    if (
      !isBandMember(band, user._id.toString()) &&
      !(await db
        .collection("band_invites")
        .findOne({ bandId: bandObjectId, userId: user._id }))
    ) {
      throw new UserError("Not a member of this band");
    }

    const blobUrl = band.imageBlobUrl as string | undefined;
    if (!blobUrl) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    return streamBlobImage(blobUrl, band.imageMimeType as string | undefined);
  } catch (error) {
    return serverErrorResponse(error, "Failed to load image");
  }
}

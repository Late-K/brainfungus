import {
  serverErrorResponse,
  requireBandMemberContext,
} from "@/app/lib/server/utils";
import { getBandCovers } from "@/app/lib/server/covers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const bandId = request.nextUrl.searchParams.get("bandId");
    if (!bandId) {
      return NextResponse.json(
        { error: "Band ID is required" },
        { status: 400 },
      );
    }

    const { db, bandObjectId } = await requireBandMemberContext(bandId);
    const covers = await getBandCovers(db, bandObjectId);

    return NextResponse.json({ covers }, { status: 200 });
  } catch (error) {
    return serverErrorResponse(error, "Failed to fetch covers");
  }
}

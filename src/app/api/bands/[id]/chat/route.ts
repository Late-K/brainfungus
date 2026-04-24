import {
  COLLECTIONS,
  getServerErrorStatus,
  requireBandMemberContext,
} from "@/app/lib/serverData";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: bandId } = await params;

  try {
    const { db, bandObjectId } = await requireBandMemberContext(bandId);

    // fetch messages for the band
    const messages = await db
      .collection(COLLECTIONS.bandMessages)
      .find({ bandId: bandObjectId })
      .sort({ createdAt: 1 })
      .limit(100)
      .toArray();

    return Response.json({ messages });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    const status = getServerErrorStatus(error);
    return Response.json(
      {
        error:
          status === 500
            ? "Failed to fetch messages"
            : (error as Error).message,
      },
      { status },
    );
  }
}

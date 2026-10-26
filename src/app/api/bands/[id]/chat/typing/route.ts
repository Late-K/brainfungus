import {
  getServerErrorStatus,
  requireBandMemberContext,
} from "@/app/lib/server/utils";

// "someone is typing" pings. the chat sends one every few seconds while the
// user types, and polls read back anyone who pinged in the last few seconds.
// a route rather than a server action, since actions run one at a time and a
// ping shouldn't hold up sending a message
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: bandId } = await params;

  try {
    const { db, user, bandObjectId } = await requireBandMemberContext(bandId);
    await db
      .collection("band_chat_typing")
      .updateOne(
        { bandId: bandObjectId, userId: user._id },
        { $set: { updatedAt: new Date() } },
        { upsert: true },
      );
    return new Response(null, { status: 204 });
  } catch (error) {
    const status = getServerErrorStatus(error);
    return Response.json({ error: "Failed to update typing" }, { status });
  }
}

import { ObjectId } from "mongodb";
import {
  serverErrorResponse,
  requireBandMemberContext,
} from "@/app/lib/server/utils";
import { StoredAttachment, streamChatAttachment } from "@/app/lib/server/chat";

// streams one chat attachment to a band member. add ?download=1 to save it
// instead of opening it in the browser
export async function GET(
  request: Request,
  {
    params,
  }: { params: Promise<{ id: string; messageId: string; index: string }> },
) {
  const { id: bandId, messageId, index } = await params;
  const notFound = () =>
    Response.json({ error: "Attachment not found" }, { status: 404 });

  try {
    const { db, bandObjectId } = await requireBandMemberContext(bandId);
    if (!ObjectId.isValid(messageId)) return notFound();

    const message = await db
      .collection("band_messages")
      .findOne(
        { _id: new ObjectId(messageId), bandId: bandObjectId, deletedAt: null },
        { projection: { attachments: 1 } },
      );

    const attachment = (
      message?.attachments as StoredAttachment[] | undefined
    )?.[Number(index)];
    if (!attachment?.blobUrl) return notFound();

    const forceDownload =
      new URL(request.url).searchParams.get("download") === "1";
    return streamChatAttachment(request, attachment, forceDownload);
  } catch (error) {
    return serverErrorResponse(error, "Failed to load attachment");
  }
}

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import {
  getServerErrorStatus,
  requireBandMemberContext,
} from "@/app/lib/server/utils";
import { UserError } from "@/app/lib/actionResult";
import { MAX_ATTACHMENT_BYTES, chatUploadPrefix } from "@/app/lib/chatConfig";

// hands the browser a short lived token so chat attachments upload straight
// to blob storage instead of squeezing through a server function's body limit.
// the message itself is only created once the upload is done, by
// sendChatMessageAction, which checks the blob really is in this band's folder
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: bandId } = await params;

  try {
    const body = (await request.json()) as HandleUploadBody;

    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        await requireBandMemberContext(bandId);

        if (
          !pathname.startsWith(chatUploadPrefix(bandId)) ||
          pathname.includes("..")
        ) {
          throw new UserError("Invalid upload path");
        }

        return {
          maximumSizeInBytes: MAX_ATTACHMENT_BYTES,
          addRandomSuffix: true,
        };
      },
    });

    return Response.json(result);
  } catch (error) {
    console.error("Chat upload failed:", error);
    // most failures here are rejected uploads, so report them as bad requests
    const status = getServerErrorStatus(error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: status === 500 ? 400 : status },
    );
  }
}

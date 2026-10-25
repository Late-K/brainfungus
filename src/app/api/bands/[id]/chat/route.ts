import { Document, Filter } from "mongodb";
import {
  getServerErrorStatus,
  requireBandMemberContext,
} from "@/app/lib/serverUtils";
import { getTypingUsers, serializeMessages } from "@/app/lib/chatServer";
import { CHAT_PAGE_SIZE } from "@/app/lib/chatConfig";
import { ChatMessagesResponse } from "@/app/types";

// how far back each poll reaches past the last one, so a message written
// while the previous poll was running is never missed
const SYNC_OVERLAP_MS = 5000;

function parseDate(value: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

// GET                  latest page of messages
// GET ?before=<iso>    the page of messages older than that
// GET ?since=<iso>     every message created or changed since then (polling)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: bandId } = await params;
  const searchParams = new URL(request.url).searchParams;
  const before = parseDate(searchParams.get("before"));
  const since = parseDate(searchParams.get("since"));

  try {
    const { db, user, bandObjectId } = await requireBandMemberContext(bandId);
    const syncedAt = new Date(Date.now() - SYNC_OVERLAP_MS).toISOString();
    const messagesCollection = db.collection("band_messages");

    let rawMessages: Document[];
    let hasMore: boolean | undefined;

    if (since) {
      rawMessages = await messagesCollection
        .find({
          bandId: bandObjectId,
          $or: [{ updatedAt: { $gte: since } }, { createdAt: { $gte: since } }],
        })
        .sort({ createdAt: 1 })
        .limit(500)
        .toArray();
    } else {
      const filter: Filter<Document> = { bandId: bandObjectId };
      if (before) filter.createdAt = { $lt: before };

      // newest first so the limit keeps the latest, then flip back
      const page = await messagesCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(CHAT_PAGE_SIZE + 1)
        .toArray();
      hasMore = page.length > CHAT_PAGE_SIZE;
      rawMessages = page.slice(0, CHAT_PAGE_SIZE).reverse();
    }

    const [messages, typing] = await Promise.all([
      serializeMessages(db, rawMessages),
      before ? Promise.resolve(undefined) : getTypingUsers(db, bandObjectId, user._id),
    ]);

    const body: ChatMessagesResponse = {
      messages,
      currentUserId: user._id.toString(),
      syncedAt,
      hasMore,
      typing,
    };
    return Response.json(body);
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

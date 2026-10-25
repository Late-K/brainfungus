"use server";

import { del, head } from "@vercel/blob";
import { ObjectId } from "mongodb";
import { requireBandMemberContext } from "@/app/lib/serverUtils";
import { notifyBandMembers, truncate } from "@/app/lib/push";
import { serializeMessages, StoredAttachment } from "@/app/lib/chatServer";
import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  MAX_MESSAGE_LENGTH,
  attachmentKindFor,
  attachmentLabel,
  baseMimeType,
  chatUploadPrefix,
} from "@/app/lib/chatConfig";
import { Message } from "@/app/types";

// what the browser sends for each file it has already uploaded to blob storage
export type ChatAttachmentInput = {
  url: string;
  name: string;
  duration?: number;
  width?: number;
  height?: number;
};

function positiveNumber(value: unknown, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.min(value, max)
    : undefined;
}

function cleanText(message: unknown) {
  const text = typeof message === "string" ? message.trim() : "";
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new Error(
      `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`,
    );
  }
  return text;
}

// checks an uploaded blob really is in this band's chat folder, and reads its
// type and size from storage rather than trusting the browser
async function verifyAttachment(
  bandId: string,
  input: ChatAttachmentInput,
): Promise<StoredAttachment> {
  if (!input || typeof input.url !== "string") {
    throw new Error("Invalid attachment");
  }

  let blob;
  try {
    blob = await head(input.url);
  } catch {
    throw new Error("Attachment upload not found - try sending it again");
  }

  if (!blob.pathname.startsWith(chatUploadPrefix(bandId))) {
    throw new Error("Invalid attachment");
  }
  if (blob.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("Attachment is too large");
  }

  const mimeType = baseMimeType(blob.contentType) || "application/octet-stream";
  const kind = attachmentKindFor(mimeType);
  const name =
    (typeof input.name === "string" && input.name.trim().slice(0, 200)) ||
    blob.pathname.split("/").pop() ||
    "file";

  const attachment: StoredAttachment = {
    kind,
    blobUrl: blob.url,
    pathname: blob.pathname,
    mimeType,
    name,
    size: blob.size,
  };
  if (kind === "audio" || kind === "video") {
    const duration = positiveNumber(input.duration, 60 * 60 * 6);
    if (duration) attachment.duration = Math.round(duration * 10) / 10;
  }
  if (kind === "image" || kind === "video") {
    const width = positiveNumber(input.width, 20000);
    const height = positiveNumber(input.height, 20000);
    if (width && height) {
      attachment.width = Math.round(width);
      attachment.height = Math.round(height);
    }
  }
  return attachment;
}

async function deleteAttachmentBlobs(attachments: unknown) {
  const urls = ((attachments as StoredAttachment[] | undefined) ?? [])
    .map((a) => a.blobUrl)
    .filter(Boolean);
  if (urls.length === 0) return;
  try {
    await del(urls);
  } catch (blobErr) {
    console.error("Failed to delete chat attachment blobs:", blobErr);
  }
}

// loads a message for a band member, optionally only if they sent it
async function requireMessage(
  bandId: string,
  messageId: string,
  { ownOnly = false } = {},
) {
  if (!ObjectId.isValid(messageId)) throw new Error("Message not found");
  const context = await requireBandMemberContext(bandId);

  const message = await context.db.collection("band_messages").findOne({
    _id: new ObjectId(messageId),
    bandId: context.bandObjectId,
  });
  if (!message || message.deletedAt) throw new Error("Message not found");

  if (ownOnly && message.userId?.toString() !== context.user._id.toString()) {
    throw new Error("You can only change your own messages");
  }

  return { ...context, message };
}

async function loadSerialized(
  db: Awaited<ReturnType<typeof requireBandMemberContext>>["db"],
  messageId: ObjectId,
): Promise<Message> {
  const doc = await db.collection("band_messages").findOne({ _id: messageId });
  if (!doc) throw new Error("Message not found");
  const [message] = await serializeMessages(db, [doc]);
  return message;
}

export async function sendChatMessageAction(
  bandId: string,
  input: {
    message?: string;
    replyToId?: string | null;
    attachments?: ChatAttachmentInput[];
  },
): Promise<{ success: true; message: Message }> {
  try {
    const text = cleanText(input.message);
    const attachmentInputs = Array.isArray(input.attachments)
      ? input.attachments
      : [];

    if (!text && attachmentInputs.length === 0) {
      throw new Error("Message is required");
    }
    if (attachmentInputs.length > MAX_ATTACHMENTS) {
      throw new Error(`You can send up to ${MAX_ATTACHMENTS} files at once`);
    }

    const { db, user, band, bandObjectId } =
      await requireBandMemberContext(bandId);

    const attachments = await Promise.all(
      attachmentInputs.map((a) => verifyAttachment(bandId, a)),
    );

    let replyTo: ObjectId | undefined;
    if (input.replyToId) {
      if (!ObjectId.isValid(input.replyToId)) {
        throw new Error("Message being replied to was not found");
      }
      const original = await db
        .collection("band_messages")
        .findOne(
          { _id: new ObjectId(input.replyToId), bandId: bandObjectId },
          { projection: { _id: 1 } },
        );
      if (!original) throw new Error("Message being replied to was not found");
      replyTo = original._id;
    }

    // store only the userId, sender details are resolved when read
    const now = new Date();
    const doc: Record<string, unknown> = {
      bandId: bandObjectId,
      userId: user._id,
      message: text,
      createdAt: now,
      updatedAt: now,
    };
    if (replyTo) doc.replyTo = replyTo;
    if (attachments.length > 0) doc.attachments = attachments;

    const result = await db.collection("band_messages").insertOne(doc);

    // whoever sends a message has stopped typing
    await db
      .collection("band_chat_typing")
      .deleteOne({ bandId: bandObjectId, userId: user._id });

    const preview =
      text ||
      (attachments.length > 1
        ? `📎 ${attachments.length} files`
        : attachments[0]?.kind === "file"
          ? `📎 ${attachments[0].name}`
          : attachmentLabel(attachments[0]?.kind));
    notifyBandMembers(db, band, user._id.toString(), "chat", {
      title: band.name,
      body: truncate(`${user.name || "Someone"}: ${preview}`, 140),
      url: `/bands/${bandId}/chat`,
      tag: `chat-${bandId}`,
    });

    return {
      success: true,
      message: await loadSerialized(db, result.insertedId),
    };
  } catch (error) {
    console.error("Error sending chat message:", error);
    throw error instanceof Error ? error : new Error("Failed to send message");
  }
}

export async function editChatMessageAction(
  bandId: string,
  messageId: string,
  message: string,
): Promise<{ success: true; message: Message }> {
  try {
    const text = cleanText(message);
    const { db, message: existing } = await requireMessage(bandId, messageId, {
      ownOnly: true,
    });

    const hasAttachments =
      ((existing.attachments as unknown[] | undefined) ?? []).length > 0;
    if (!text && !hasAttachments) throw new Error("Message is required");

    if (text !== existing.message) {
      const now = new Date();
      await db
        .collection("band_messages")
        .updateOne(
          { _id: existing._id },
          { $set: { message: text, editedAt: now, updatedAt: now } },
        );
    }

    return { success: true, message: await loadSerialized(db, existing._id) };
  } catch (error) {
    console.error("Error editing chat message:", error);
    throw error instanceof Error ? error : new Error("Failed to edit message");
  }
}

// deleted messages stay as a "message deleted" placeholder so replies to them
// still make sense, but their text and files are removed for good
export async function deleteChatMessageAction(
  bandId: string,
  messageId: string,
): Promise<{ success: true; message: Message }> {
  try {
    const { db, message: existing } = await requireMessage(bandId, messageId, {
      ownOnly: true,
    });

    const now = new Date();
    await db.collection("band_messages").updateOne(
      { _id: existing._id },
      {
        $set: { message: "", deletedAt: now, updatedAt: now },
        $unset: { attachments: "", reactions: "", editedAt: "" },
      },
    );
    await deleteAttachmentBlobs(existing.attachments);

    return { success: true, message: await loadSerialized(db, existing._id) };
  } catch (error) {
    console.error("Error deleting chat message:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to delete message");
  }
}

// adds the reaction, or takes it away if this user already reacted with it
export async function toggleChatReactionAction(
  bandId: string,
  messageId: string,
  emoji: string,
): Promise<{ success: true; message: Message }> {
  try {
    // one emoji (which can be several code points, e.g. flags or skin tones)
    if (
      typeof emoji !== "string" ||
      !emoji.trim() ||
      emoji.length > 16 ||
      /[\s<>]/.test(emoji)
    ) {
      throw new Error("Invalid reaction");
    }

    const { db, user, message: existing } = await requireMessage(
      bandId,
      messageId,
    );
    const userId = user._id.toString();
    const reactions =
      (existing.reactions as { emoji: string; userId: string }[] | undefined) ??
      [];
    const alreadyReacted = reactions.some(
      (r) => r.emoji === emoji && r.userId === userId,
    );

    const messages = db.collection<{
      reactions?: { emoji: string; userId: string }[];
      updatedAt?: Date;
    }>("band_messages");
    const reaction = { emoji, userId };
    const $set = { updatedAt: new Date() };
    await messages.updateOne(
      { _id: existing._id },
      alreadyReacted
        ? { $pull: { reactions: reaction }, $set }
        : { $push: { reactions: reaction }, $set },
    );

    return { success: true, message: await loadSerialized(db, existing._id) };
  } catch (error) {
    console.error("Error reacting to chat message:", error);
    throw error instanceof Error ? error : new Error("Failed to react");
  }
}

// an uploaded file the user removed before sending, or a send that failed
export async function discardChatUploadsAction(
  bandId: string,
  urls: string[],
): Promise<void> {
  const { db } = await requireBandMemberContext(bandId);
  const unsent: string[] = [];
  for (const url of (Array.isArray(urls) ? urls : []).slice(0, MAX_ATTACHMENTS)) {
    try {
      const blob = await head(url);
      if (!blob.pathname.startsWith(chatUploadPrefix(bandId))) continue;
      // never remove a file that has already been sent in a message
      const sent = await db
        .collection("band_messages")
        .findOne({ "attachments.blobUrl": blob.url }, { projection: { _id: 1 } });
      if (!sent) unsent.push(blob.url);
    } catch {
      // already gone
    }
  }
  if (unsent.length > 0) await del(unsent);
}

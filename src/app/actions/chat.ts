"use server";

import { del, head } from "@vercel/blob";
import { ObjectId } from "mongodb";
import { requireBandMemberContext, toObjectId } from "@/app/lib/server/utils";
import { deleteBlobsQuietly } from "@/app/lib/server/blobStorage";
import { runAction, UserError } from "@/app/lib/actionResult";
import { readOptionalString, readStringArray } from "@/app/lib/validate";
import { notifyUsers, truncate } from "@/app/lib/server/push";
import {
  getChatMembers,
  serializeMessages,
  StoredAttachment,
} from "@/app/lib/server/chat";
import { MENTION_EVERYONE, findMentions } from "@/app/lib/chatMentions";
import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  MAX_MESSAGE_LENGTH,
  attachmentKindFor,
  attachmentLabel,
  baseMimeType,
  chatUploadPrefix,
} from "@/app/lib/chatConfig";
import { ChatMention, Message } from "@/app/types";

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
    throw new UserError(
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
    throw new UserError("Invalid attachment");
  }

  let blob;
  try {
    blob = await head(input.url);
  } catch {
    throw new UserError("Attachment upload not found - try sending it again");
  }

  if (!blob.pathname.startsWith(chatUploadPrefix(bandId))) {
    throw new UserError("Invalid attachment");
  }
  if (blob.size > MAX_ATTACHMENT_BYTES) {
    throw new UserError("Attachment is too large");
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

// loads a message for a band member, optionally only if they sent it
async function requireMessage(
  bandId: string,
  messageId: string,
  { ownOnly = false } = {},
) {
  const messageObjectId = toObjectId(messageId, "message ID");
  const context = await requireBandMemberContext(bandId);

  const message = await context.db.collection("band_messages").findOne({
    _id: messageObjectId,
    bandId: context.bandObjectId,
  });
  if (!message || message.deletedAt) throw new UserError("Message not found");

  if (ownOnly && message.userId?.toString() !== context.user._id.toString()) {
    throw new UserError("You can only change your own messages");
  }

  return { ...context, message };
}

// the user ids a message's mentions point at, with @everyone meaning every
// member. the sender never counts
function mentionedUserIds(
  mentions: ChatMention[],
  memberIds: string[],
  senderId: string,
) {
  const everyone = mentions.some((m) => m.userId === MENTION_EVERYONE);
  return memberIds.filter(
    (id) =>
      id !== senderId &&
      (everyone || mentions.some((m) => m.userId === id)),
  );
}

// people mentioned by name hear about it even if they've muted the band,
// @everyone respects the mute like any other message
function notifyMentioned(
  db: Awaited<ReturnType<typeof requireBandMemberContext>>["db"],
  bandId: string,
  mentions: ChatMention[],
  userIds: string[],
  payload: { title: string; body: string; url: string; tag: string },
) {
  if (userIds.length === 0) return;
  const named = userIds.filter((id) => mentions.some((m) => m.userId === id));
  const rest = userIds.filter((id) => !named.includes(id));
  notifyUsers(db, named, "mentions", bandId, payload, {
    ignoreBandMute: true,
  });
  notifyUsers(db, rest, "mentions", bandId, payload);
}

async function loadSerialized(
  db: Awaited<ReturnType<typeof requireBandMemberContext>>["db"],
  messageId: ObjectId,
): Promise<Message> {
  const doc = await db.collection("band_messages").findOne({ _id: messageId });
  if (!doc) throw new UserError("Message not found");
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
) {
  return runAction(
    "Failed to send message",
    async (): Promise<{ message: Message }> => {
      const text = cleanText(input?.message);
      const attachmentInputs = Array.isArray(input?.attachments)
        ? input.attachments
        : [];
      const replyToId = readOptionalString(input?.replyToId, "reply", 24);

      if (!text && attachmentInputs.length === 0) {
        throw new UserError("Message is required");
      }
      if (attachmentInputs.length > MAX_ATTACHMENTS) {
        throw new UserError(
          `You can send up to ${MAX_ATTACHMENTS} files at once`,
        );
      }

      const { db, user, band, bandObjectId } =
        await requireBandMemberContext(bandId);

      const attachments = await Promise.all(
        attachmentInputs.map((a) => verifyAttachment(bandId, a)),
      );

      let replyTo: ObjectId | undefined;
      if (replyToId) {
        if (!ObjectId.isValid(replyToId)) {
          throw new UserError("Message being replied to was not found");
        }
        const original = await db
          .collection("band_messages")
          .findOne(
            { _id: new ObjectId(replyToId), bandId: bandObjectId },
            { projection: { _id: 1 } },
          );
        if (!original)
          throw new UserError("Message being replied to was not found");
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
      const mentions = findMentions(text, await getChatMembers(db, band));
      if (mentions.length > 0) doc.mentions = mentions;

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
      // mentioned members get a mention notification instead of the usual one
      const senderId = user._id.toString();
      const memberIds = ((band.members as { userId: string }[]) ?? []).map(
        (m) => m.userId,
      );
      const mentioned = mentionedUserIds(mentions, memberIds, senderId);
      const body = truncate(`${user.name || "Someone"}: ${preview}`, 140);
      notifyUsers(
        db,
        memberIds.filter((id) => id !== senderId && !mentioned.includes(id)),
        "chat",
        bandId,
        {
          title: band.name,
          body,
          url: `/bands/${bandId}/chat`,
          tag: `chat-${bandId}`,
        },
      );
      notifyMentioned(db, bandId, mentions, mentioned, {
        title: `${user.name || "Someone"} mentioned you in ${band.name}`,
        body: truncate(preview, 140),
        url: `/bands/${bandId}/chat`,
        tag: `mention-${result.insertedId.toString()}`,
      });

      return { message: await loadSerialized(db, result.insertedId) };
    },
  );
}

export async function editChatMessageAction(
  bandId: string,
  messageId: string,
  message: string,
) {
  return runAction("Failed to edit message", async () => {
    const text = cleanText(message);
    const {
      db,
      user,
      band,
      message: existing,
    } = await requireMessage(bandId, messageId, { ownOnly: true });

    const hasAttachments =
      ((existing.attachments as unknown[] | undefined) ?? []).length > 0;
    if (!text && !hasAttachments) throw new UserError("Message is required");

    if (text !== existing.message) {
      const now = new Date();
      const mentions = findMentions(text, await getChatMembers(db, band));
      await db.collection("band_messages").updateOne(
        { _id: existing._id },
        mentions.length > 0
          ? { $set: { message: text, mentions, editedAt: now, updatedAt: now } }
          : {
              $set: { message: text, editedAt: now, updatedAt: now },
              $unset: { mentions: "" },
            },
      );

      // only people the edit newly mentions are told about it
      const senderId = user._id.toString();
      const memberIds = ((band.members as { userId: string }[]) ?? []).map(
        (m) => m.userId,
      );
      const before = mentionedUserIds(
        (existing.mentions as ChatMention[] | undefined) ?? [],
        memberIds,
        senderId,
      );
      const added = mentionedUserIds(mentions, memberIds, senderId).filter(
        (id) => !before.includes(id),
      );
      notifyMentioned(db, bandId, mentions, added, {
        title: `${user.name || "Someone"} mentioned you in ${band.name}`,
        body: truncate(text, 140),
        url: `/bands/${bandId}/chat`,
        tag: `mention-${existing._id.toString()}`,
      });
    }

    return { message: await loadSerialized(db, existing._id) };
  });
}

// deleted messages stay as a "message deleted" placeholder so replies to them
// still make sense, but their text and files are removed for good
export async function deleteChatMessageAction(
  bandId: string,
  messageId: string,
) {
  return runAction("Failed to delete message", async () => {
    const { db, message: existing } = await requireMessage(bandId, messageId, {
      ownOnly: true,
    });

    const now = new Date();
    await db.collection("band_messages").updateOne(
      { _id: existing._id },
      {
        $set: { message: "", deletedAt: now, updatedAt: now },
        $unset: {
          attachments: "",
          reactions: "",
          editedAt: "",
          mentions: "",
        },
      },
    );
    await deleteBlobsQuietly(
      ((existing.attachments as StoredAttachment[] | undefined) ?? []).map(
        (a) => a.blobUrl,
      ),
      "chat attachment",
    );

    return { message: await loadSerialized(db, existing._id) };
  });
}

// adds the reaction, or takes it away if this user already reacted with it
export async function toggleChatReactionAction(
  bandId: string,
  messageId: string,
  emoji: string,
) {
  return runAction("Failed to react", async () => {
    // one emoji (which can be several code points, e.g. flags or skin tones)
    if (
      typeof emoji !== "string" ||
      !emoji.trim() ||
      emoji.length > 16 ||
      /[\s<>]/.test(emoji)
    ) {
      throw new UserError("Invalid reaction");
    }

    const {
      db,
      user,
      message: existing,
    } = await requireMessage(bandId, messageId);
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

    return { message: await loadSerialized(db, existing._id) };
  });
}

// an uploaded file the user removed before sending, or a send that failed
export async function discardChatUploadsAction(bandId: string, urls: string[]) {
  return runAction("Failed to discard uploads", async () => {
    const { db } = await requireBandMemberContext(bandId);
    const unsent: string[] = [];
    for (const url of readStringArray(urls, "uploads", MAX_ATTACHMENTS)) {
      try {
        const blob = await head(url);
        if (!blob.pathname.startsWith(chatUploadPrefix(bandId))) continue;
        // never remove a file that has already been sent in a message
        const sent = await db
          .collection("band_messages")
          .findOne(
            { "attachments.blobUrl": blob.url },
            { projection: { _id: 1 } },
          );
        if (!sent) unsent.push(blob.url);
      } catch {
        // already gone
      }
    }
    if (unsent.length > 0) await del(unsent);
  });
}

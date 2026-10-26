import "server-only";

import { Db, Document, ObjectId } from "mongodb";
import { streamPrivateBlob } from "@/app/lib/server/blobStorage";
import {
  ChatAttachmentKind,
  ChatGif,
  ChatMember,
  ChatMention,
  ChatTypingUser,
  Message,
  MessageAttachment,
  MessageReaction,
  MessageReplyPreview,
} from "@/app/types";

// band chat messages live in band_messages. attachments are uploaded straight
// from the browser to private blob storage, and served back through
// /api/bands/[id]/chat/attachments/[messageId]/[index] so only members see them

export const TYPING_TTL_MS = 6000;

export type StoredAttachment = {
  kind: ChatAttachmentKind;
  blobUrl: string;
  pathname: string;
  mimeType: string;
  name: string;
  size: number;
  duration?: number;
  width?: number;
  height?: number;
};

type UserInfo = { email: string; name: string; image?: string | null };

function toIdString(value: unknown) {
  return value == null ? undefined : String(value);
}

function toIso(value: unknown) {
  return value instanceof Date ? value.toISOString() : toIdString(value);
}

async function getUserMap(db: Db, ids: Iterable<string | undefined>) {
  const objectIds = [...new Set(ids)]
    .filter((id): id is string => !!id && ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  const map = new Map<string, UserInfo>();
  if (objectIds.length === 0) return map;

  const users = await db
    .collection("users")
    .find({ _id: { $in: objectIds } })
    .project({ email: 1, name: 1, image: 1 })
    .toArray();
  for (const u of users) {
    map.set(u._id.toString(), { email: u.email, name: u.name, image: u.image });
  }
  return map;
}

export function attachmentUrl(
  bandId: string,
  messageId: string,
  index: number,
) {
  return `/api/bands/${bandId}/chat/attachments/${messageId}/${index}`;
}

// turns raw band_messages documents into what the chat ui expects, resolving
// senders, reaction names and the message each one replies to
export async function serializeMessages(
  db: Db,
  docs: Document[],
): Promise<Message[]> {
  if (docs.length === 0) return [];

  const replyIds = [
    ...new Set(
      docs
        .map((m) => toIdString(m.replyTo))
        .filter((id): id is string => !!id && ObjectId.isValid(id)),
    ),
  ];
  const replyDocs = replyIds.length
    ? await db
        .collection("band_messages")
        .find({ _id: { $in: replyIds.map((id) => new ObjectId(id)) } })
        .project({
          userId: 1,
          message: 1,
          attachments: 1,
          gif: 1,
          deletedAt: 1,
        })
        .toArray()
    : [];
  const replyMap = new Map(replyDocs.map((r) => [r._id.toString(), r]));

  const userIds: (string | undefined)[] = [];
  for (const m of [...docs, ...replyDocs]) {
    userIds.push(toIdString(m.userId));
    for (const r of (m.reactions as { userId: string }[] | undefined) ?? []) {
      userIds.push(r.userId);
    }
  }
  const users = await getUserMap(db, userIds);
  const nameFor = (id: string | undefined, fallback?: string) =>
    (id && users.get(id)?.name) || fallback || "Unknown";

  return docs.map((m) => {
    const id = m._id.toString();
    const bandId = toIdString(m.bandId) ?? "";
    const uid = toIdString(m.userId) ?? "";
    const user = users.get(uid);
    const deleted = !!m.deletedAt;

    let replyTo: MessageReplyPreview | null = null;
    const replyId = toIdString(m.replyTo);
    if (replyId && !deleted) {
      const reply = replyMap.get(replyId);
      replyTo = reply
        ? {
            _id: replyId,
            userName: nameFor(toIdString(reply.userId)),
            message: reply.deletedAt
              ? ""
              : String(reply.message ?? "").slice(0, 200),
            attachmentKind: reply.deletedAt
              ? undefined
              : reply.gif
                ? "gif"
                : (reply.attachments as StoredAttachment[] | undefined)?.[0]
                    ?.kind,
            deleted: !!reply.deletedAt,
          }
        : { _id: replyId, userName: "", message: "", deleted: true };
    }

    const attachments: MessageAttachment[] = deleted
      ? []
      : ((m.attachments as StoredAttachment[] | undefined) ?? []).map(
          (a, index) => ({
            kind: a.kind,
            url: attachmentUrl(bandId, id, index),
            name: a.name,
            size: a.size,
            mimeType: a.mimeType,
            duration: a.duration,
            width: a.width,
            height: a.height,
          }),
        );

    // group the flat { emoji, userId } list by emoji, keeping first-use order
    const gif = deleted ? null : ((m.gif as ChatGif | undefined) ?? null);

    const reactions: MessageReaction[] = [];
    if (!deleted) {
      for (const r of (m.reactions as
        | { emoji: string; userId: string }[]
        | undefined) ?? []) {
        let group = reactions.find((g) => g.emoji === r.emoji);
        if (!group) {
          group = { emoji: r.emoji, userIds: [], userNames: [] };
          reactions.push(group);
        }
        group.userIds.push(r.userId);
        group.userNames.push(nameFor(r.userId));
      }
    }

    return {
      _id: id,
      bandId,
      userId: uid,
      userEmail: m.userEmail ?? user?.email ?? "",
      userName: m.userName ?? user?.name ?? "Unknown",
      userImage: m.userImage ?? user?.image ?? null,
      message: deleted ? "" : String(m.message ?? ""),
      createdAt: toIso(m.createdAt) ?? new Date(0).toISOString(),
      editedAt: deleted ? null : (toIso(m.editedAt) ?? null),
      deleted,
      replyTo,
      attachments,
      gif: gif && {
        id: gif.id,
        title: gif.title,
        url: gif.url,
        previewUrl: gif.previewUrl,
        width: gif.width,
        height: gif.height,
      },
      reactions,
      mentions: deleted
        ? []
        : ((m.mentions as ChatMention[] | undefined) ?? []).map((x) => ({
            userId: x.userId,
            name: x.name,
          })),
    };
  });
}

// the band's members, for @mentions
export async function getChatMembers(
  db: Db,
  band: Document,
): Promise<ChatMember[]> {
  const memberIds = ((band.members as { userId: string }[]) ?? []).map(
    (m) => m.userId,
  );
  const users = await getUserMap(db, memberIds);
  return memberIds
    .filter((id) => users.has(id))
    .map((id) => {
      const user = users.get(id)!;
      return { userId: id, name: user.name || "", image: user.image ?? null };
    });
}

export async function getTypingUsers(
  db: Db,
  bandObjectId: ObjectId,
  currentUserId: ObjectId,
): Promise<ChatTypingUser[]> {
  const docs = await db
    .collection("band_chat_typing")
    .find({
      bandId: bandObjectId,
      userId: { $ne: currentUserId },
      updatedAt: { $gt: new Date(Date.now() - TYPING_TTL_MS) },
    })
    .toArray();

  const users = await getUserMap(
    db,
    docs.map((d) => toIdString(d.userId)),
  );
  return docs.map((d) => {
    const userId = d.userId.toString();
    return { userId, userName: users.get(userId)?.name || "Someone" };
  });
}

// streams a private chat attachment
export function streamChatAttachment(
  request: Request,
  attachment: StoredAttachment,
  forceDownload: boolean,
) {
  const inline = attachment.kind !== "file" && !forceDownload;
  return streamPrivateBlob(attachment.blobUrl, {
    range: request.headers.get("range"),
    headers: {
      // anything that isn't a known safe media type is sent as a plain download
      "Content-Type":
        attachment.kind === "file"
          ? "application/octet-stream"
          : attachment.mimeType,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(attachment.name)}`,
      // attachments never change once sent
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}

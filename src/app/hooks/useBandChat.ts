"use client";

// band chat state: loading pages of messages, polling for new and changed
// ones, sending (with attachment uploads), editing, deleting and reactions

import { useCallback, useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  ChatAttachmentInput,
  deleteChatMessageAction,
  discardChatUploadsAction,
  editChatMessageAction,
  sendChatMessageAction,
  toggleChatReactionAction,
} from "@/app/actions/chat";
import { chatUploadPrefix } from "@/app/lib/chatConfig";
import {
  ChatAttachmentKind,
  ChatMessagesResponse,
  ChatTypingUser,
  Message,
  MessageReplyPreview,
} from "@/app/types";

const POLL_MS = 3000;
const TYPING_PING_MS = 3000;

// a file picked in the composer, with what we could measure about it up front
export interface DraftAttachment {
  id: string;
  file: File;
  kind: ChatAttachmentKind;
  previewUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
}

// a message that is still uploading/sending, or that failed to send
export interface PendingMessage {
  tempId: string;
  text: string;
  replyTo: MessageReplyPreview | null;
  attachments: DraftAttachment[];
  progress: number;
  status: "sending" | "failed";
  error?: string;
  // uploads that already finished, so a retry doesn't upload them again
  uploaded: (ChatAttachmentInput | undefined)[];
}

export interface SendInput {
  text: string;
  replyTo: Message | null;
  attachments: DraftAttachment[];
}

function mergeMessages(prev: Message[], incoming: Message[]) {
  if (incoming.length === 0) return prev;
  const byId = new Map(prev.map((m) => [m._id, m]));
  let changed = false;
  for (const message of incoming) {
    const existing = byId.get(message._id);
    if (!existing || JSON.stringify(existing) !== JSON.stringify(message)) {
      byId.set(message._id, message);
      changed = true;
    }
  }
  if (!changed) return prev;
  return [...byId.values()].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
}

export function toReplyPreview(message: Message): MessageReplyPreview {
  return {
    _id: message._id,
    userName: message.userName,
    message: message.message.slice(0, 200),
    attachmentKind: message.attachments?.[0]?.kind,
    deleted: message.deleted,
  };
}

function uploadPathname(bandId: string, file: File) {
  const safeName = (file.name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${chatUploadPrefix(bandId)}${safeName}`;
}

export function useBandChat(bandId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [typing, setTyping] = useState<ChatTypingUser[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [error, setError] = useState("");

  const syncedAtRef = useRef<string | null>(null);
  const pollingRef = useRef(false);
  const lastTypingPingRef = useRef(0);
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  const applyResponse = useCallback((data: ChatMessagesResponse) => {
    setCurrentUserId(data.currentUserId);
    if (data.typing) setTyping(data.typing);
    setMessages((prev) => mergeMessages(prev, data.messages));
  }, []);

  // first page
  useEffect(() => {
    if (!bandId) return;
    const controller = new AbortController();
    setIsLoading(true);
    setMessages([]);
    syncedAtRef.current = null;

    (async () => {
      try {
        const res = await fetch(`/api/bands/${bandId}/chat`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to load messages");
        const data: ChatMessagesResponse = await res.json();
        syncedAtRef.current = data.syncedAt;
        setHasMore(!!data.hasMore);
        applyResponse(data);
        setError("");
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to load messages");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [bandId, applyResponse]);

  // asks only for what changed since the last poll
  const poll = useCallback(async () => {
    if (!bandId || !syncedAtRef.current || pollingRef.current) return;
    pollingRef.current = true;
    try {
      const res = await fetch(
        `/api/bands/${bandId}/chat?since=${encodeURIComponent(syncedAtRef.current)}`,
      );
      if (!res.ok) return;
      const data: ChatMessagesResponse = await res.json();
      syncedAtRef.current = data.syncedAt;
      applyResponse(data);
    } catch {
      // a missed poll is fine, the next one catches up
    } finally {
      pollingRef.current = false;
    }
  }, [bandId, applyResponse]);

  useEffect(() => {
    if (!bandId) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") poll();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [bandId, poll]);

  const loadOlder = useCallback(async () => {
    const oldest = messages[0];
    if (!oldest || isLoadingOlder) return;
    setIsLoadingOlder(true);
    try {
      const res = await fetch(
        `/api/bands/${bandId}/chat?before=${encodeURIComponent(oldest.createdAt)}`,
      );
      if (!res.ok) throw new Error("Failed to load older messages");
      const data: ChatMessagesResponse = await res.json();
      setHasMore(!!data.hasMore);
      setMessages((prev) => mergeMessages(prev, data.messages));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load older messages",
      );
    } finally {
      setIsLoadingOlder(false);
    }
  }, [bandId, messages, isLoadingOlder]);

  const updatePending = useCallback(
    (tempId: string, changes: Partial<PendingMessage>) => {
      setPending((prev) =>
        prev.map((p) => (p.tempId === tempId ? { ...p, ...changes } : p)),
      );
    },
    [],
  );

  const deliver = useCallback(
    async (item: PendingMessage) => {
      const { tempId } = item;
      const uploaded = [...item.uploaded];
      const totalBytes =
        item.attachments.reduce((sum, a) => sum + a.file.size, 0) || 1;
      const loaded = item.attachments.map((a, i) =>
        uploaded[i] ? a.file.size : 0,
      );

      try {
        updatePending(tempId, { status: "sending", error: undefined });

        await Promise.all(
          item.attachments.map(async (attachment, i) => {
            if (uploaded[i]) return;
            const { file } = attachment;
            const blob = await upload(uploadPathname(bandId, file), file, {
              access: "private",
              handleUploadUrl: `/api/bands/${bandId}/chat/upload`,
              contentType: file.type || "application/octet-stream",
              multipart: file.size > 8 * 1024 * 1024,
              onUploadProgress: ({ loaded: done }) => {
                loaded[i] = done;
                const sum = loaded.reduce((a, b) => a + b, 0);
                updatePending(tempId, {
                  progress: Math.min(99, Math.round((sum / totalBytes) * 100)),
                });
              },
            });
            uploaded[i] = {
              url: blob.url,
              name: file.name || "file",
              duration: attachment.duration,
              width: attachment.width,
              height: attachment.height,
            };
            updatePending(tempId, { uploaded: [...uploaded] });
          }),
        );

        updatePending(tempId, { progress: 100 });
        const result = await sendChatMessageAction(bandId, {
          message: item.text,
          replyToId: item.replyTo?._id ?? null,
          attachments: uploaded.filter(
            (a): a is ChatAttachmentInput => !!a,
          ),
        });

        setMessages((prev) => mergeMessages(prev, [result.message]));
        setPending((prev) => prev.filter((p) => p.tempId !== tempId));
        for (const a of item.attachments) {
          if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
        }
      } catch (err) {
        updatePending(tempId, {
          status: "failed",
          uploaded: [...uploaded],
          error: err instanceof Error ? err.message : "Failed to send",
        });
      }
    },
    [bandId, updatePending],
  );

  const send = useCallback(
    (input: SendInput) => {
      const item: PendingMessage = {
        tempId: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        text: input.text.trim(),
        replyTo: input.replyTo ? toReplyPreview(input.replyTo) : null,
        attachments: input.attachments,
        progress: 0,
        status: "sending",
        uploaded: input.attachments.map(() => undefined),
      };
      lastTypingPingRef.current = 0;
      setPending((prev) => [...prev, item]);
      deliver(item);
    },
    [deliver],
  );

  const retry = useCallback(
    (tempId: string) => {
      const item = pendingRef.current.find((p) => p.tempId === tempId);
      if (item) deliver(item);
    },
    [deliver],
  );

  const discard = useCallback(
    (tempId: string) => {
      const item = pendingRef.current.find((p) => p.tempId === tempId);
      setPending((prev) => prev.filter((p) => p.tempId !== tempId));
      if (!item) return;
      for (const a of item.attachments) {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      }
      const urls = item.uploaded
        .filter((a): a is ChatAttachmentInput => !!a)
        .map((a) => a.url);
      if (urls.length > 0) discardChatUploadsAction(bandId, urls).catch(() => {});
    },
    [bandId],
  );

  const edit = useCallback(
    async (messageId: string, text: string) => {
      const result = await editChatMessageAction(bandId, messageId, text);
      setMessages((prev) => mergeMessages(prev, [result.message]));
    },
    [bandId],
  );

  const remove = useCallback(
    async (messageId: string) => {
      const result = await deleteChatMessageAction(bandId, messageId);
      setMessages((prev) => mergeMessages(prev, [result.message]));
    },
    [bandId],
  );

  // flips the reaction straight away, then settles on what the server says
  const react = useCallback(
    async (messageId: string, emoji: string) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m._id !== messageId) return m;
          const reactions = (m.reactions ?? []).map((r) => ({ ...r }));
          const group = reactions.find((r) => r.emoji === emoji);
          if (group?.userIds.includes(currentUserId)) {
            const at = group.userIds.indexOf(currentUserId);
            group.userIds.splice(at, 1);
            group.userNames.splice(at, 1);
          } else if (group) {
            group.userIds.push(currentUserId);
            group.userNames.push("You");
          } else {
            reactions.push({ emoji, userIds: [currentUserId], userNames: ["You"] });
          }
          return { ...m, reactions: reactions.filter((r) => r.userIds.length) };
        }),
      );
      try {
        const result = await toggleChatReactionAction(bandId, messageId, emoji);
        setMessages((prev) => mergeMessages(prev, [result.message]));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to react");
        poll();
      }
    },
    [bandId, currentUserId, poll],
  );

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingPingRef.current < TYPING_PING_MS) return;
    lastTypingPingRef.current = now;
    fetch(`/api/bands/${bandId}/chat/typing`, { method: "POST" }).catch(
      () => {},
    );
  }, [bandId]);

  return {
    messages,
    pending,
    currentUserId,
    typing,
    hasMore,
    isLoading,
    isLoadingOlder,
    error,
    setError,
    loadOlder,
    send,
    retry,
    discard,
    edit,
    remove,
    react,
    notifyTyping,
  };
}

"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useBandChat } from "@/app/hooks/useBandChat";
import { useMediaQuery } from "@/app/hooks/useMediaQuery";
import { Message, MessageAttachment } from "@/app/types";
import ChatMessageItem, {
  ChatMessageHandlers,
  PendingMessageItem,
} from "@/app/components/chat/chatMessageItem";
import ChatComposer, {
  ChatComposerHandle,
} from "@/app/components/chat/chatComposer";
import ChatEmojiPicker from "@/app/components/chat/chatEmojiPicker";
import { downloadUrl } from "@/app/components/chat/chatAttachment";
import {
  ArrowDownIcon,
  CloseIcon,
  DownloadIcon,
} from "@/app/components/chat/chatIcons";

const preview_count = 3;
// messages from the same person this close together share one header
const group_gap_ms = 5 * 60 * 1000;
const near_bottom_px = 120;

function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "Europe/London",
  });
}

function dayLabel(iso: string) {
  const key = dayKey(iso);
  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 86400000).toISOString());
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function typingText(names: string[]) {
  if (names.length === 1) return `${names[0]} is typing`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing`;
  return "Several people are typing";
}

export default function BandChat({
  bandId,
  preview = false,
  fullPage = false,
  backHref,
}: {
  bandId: string;
  preview?: boolean;
  fullPage?: boolean;
  backHref?: string;
}) {
  const chat = useBandChat(bandId);
  const {
    messages,
    pending,
    currentUserId,
    error,
    setError,
    loadOlder,
    hasMore,
    isLoadingOlder,
    remove,
    react,
  } = chat;

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<MessageAttachment | null>(null);
  const [notice, setNotice] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  // createdAt of the newest message the user has scrolled down to
  const [seenUpTo, setSeenUpTo] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<ChatComposerHandle>(null);
  const atBottomRef = useRef(true);
  const restoreFromBottomRef = useRef<number | null>(null);
  const lastSeenIdRef = useRef<string | undefined>(undefined);
  const dragDepthRef = useRef(0);

  // on desktop the preview sits in its own scrolling side column, so it shows
  // the whole history; on mobile it stays a short teaser above the page
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const compact = preview && !isDesktop;

  const displayMessages = compact ? messages.slice(-preview_count) : messages;
  const lastMessage = messages.at(-1);
  const unseen = isAtBottom
    ? 0
    : messages.filter(
        (m) => m.userId !== currentUserId && m.createdAt > seenUpTo,
      ).length;

  // only moves the list, the scroll handler below keeps the state in step
  const scrollToBottom = useCallback((smooth = false) => {
    const el = containerRef.current;
    if (!el) return;
    atBottomRef.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const onScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < near_bottom_px;
    atBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
    if (atBottom && lastMessage) setSeenUpTo(lastMessage.createdAt);
  };

  // keep the view pinned to the newest message, unless the user has scrolled
  // up to read history (the jump button then counts what arrived below).
  // compact is a dep so resizing across the breakpoint keeps it pinned too
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (restoreFromBottomRef.current !== null) {
      // older messages were added above, so keep the same message in view
      el.scrollTop = el.scrollHeight - restoreFromBottomRef.current;
      restoreFromBottomRef.current = null;
      return;
    }

    const lastId = lastMessage?._id;
    const previousId = lastSeenIdRef.current;
    lastSeenIdRef.current = lastId;

    if (atBottomRef.current || previousId === undefined) {
      el.scrollTop = el.scrollHeight;
    } else if (
      lastId &&
      lastId !== previousId &&
      lastMessage?.userId === currentUserId
    ) {
      scrollToBottom(true);
    }
  }, [lastMessage, currentUserId, scrollToBottom, compact]);

  // the list's own height can change too (the desktop column fitting the
  // screen, a reply bar or emoji picker opening), so stay pinned through that
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (atBottomRef.current) el.scrollTop = el.scrollHeight;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [chat.isLoading]);

  // sending always jumps back down to your own message
  useLayoutEffect(() => {
    if (pending.length > 0) scrollToBottom();
  }, [pending.length, scrollToBottom]);

  const handleLoadOlder = () => {
    const el = containerRef.current;
    if (el) restoreFromBottomRef.current = el.scrollHeight - el.scrollTop;
    loadOlder();
  };

  const showNotice = useCallback((text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(""), 2500);
  }, []);

  const jumpTo = useCallback(
    (messageId: string) => {
      const target = document.getElementById(`chat-msg-${messageId}`);
      if (!target) {
        showNotice(
          compact
            ? "Open the full chat to see that message"
            : "That message is further back - load earlier messages to find it",
        );
        return;
      }
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightId(messageId);
      setTimeout(() => setHighlightId(null), 1600);
    },
    [compact, showNotice],
  );

  const handlers: ChatMessageHandlers = useMemo(
    () => ({
      onActivate: (id) => {
        setActiveId(id);
        setReactingTo(null);
      },
      onReply: (message) => {
        setEditing(null);
        setReplyTo(message);
        setActiveId(null);
      },
      onEdit: (message) => {
        setReplyTo(null);
        setEditing(message);
        setActiveId(null);
      },
      onDelete: async (message) => {
        setActiveId(null);
        if (!confirm("Delete this message for everyone?")) return;
        try {
          await remove(message._id);
          if (editing?._id === message._id) setEditing(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to delete");
        }
      },
      onReact: react,
      onMoreReactions: (messageId) => {
        setActiveId(null);
        setReactingTo((current) => (current === messageId ? null : messageId));
      },
      onJumpTo: jumpTo,
      onOpenImage: setLightbox,
      onMediaLoad: () => {
        if (atBottomRef.current) scrollToBottom();
      },
      onCopied: () => showNotice("Copied"),
    }),
    [editing, jumpTo, react, remove, scrollToBottom, setError, showNotice],
  );

  const editLast = () => {
    const own = [...messages]
      .reverse()
      .find((m) => m.userId === currentUserId && !m.deleted);
    if (own) {
      setReplyTo(null);
      setEditing(own);
    }
  };

  // an open message toolbar closes on any press outside it
  useEffect(() => {
    if (!activeId) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      const row = document.getElementById(`chat-msg-${activeId}`);
      if (!row?.contains(target)) {
        setActiveId(null);
        return;
      }
      if (target.closest(".chat-toolbar, .chat-quick-reactions")) return;
      // a mouse click on the open bubble toggles it closed by itself
      if (e.pointerType === "mouse" && target.closest(".chat-bubble")) return;
      setActiveId(null);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [activeId]);

  // close the lightbox with escape
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox]);

  // dropping files anywhere on the chat adds them to the message box
  const dragProps = {
    onDragEnter: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes("Files")) return;
      dragDepthRef.current += 1;
      setIsDragging(true);
    },
    onDragOver: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes("Files")) e.preventDefault();
    },
    onDragLeave: () => {
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setIsDragging(false);
    },
    onDrop: (e: React.DragEvent) => {
      if (!e.dataTransfer.files.length) return;
      e.preventDefault();
      dragDepthRef.current = 0;
      setIsDragging(false);
      composerRef.current?.addFiles(Array.from(e.dataTransfer.files));
    },
  };

  if (chat.isLoading) {
    return (
      <section className="card">
        <div className="section-header">
          <h2>Band Chat</h2>
        </div>
        <p className="empty-state">Loading chat...</p>
      </section>
    );
  }

  const typingNames = chat.typing.map((t) => t.userName);

  return (
    <section
      className={`card chat-card${fullPage ? " card-fill-page" : ""}`}
      {...dragProps}
    >
      <div className="section-header">
        <h2>Band Chat</h2>
        {compact && (
          <Link
            href={`/bands/${bandId}/chat`}
            className="button button-primary"
          >
            View All
          </Link>
        )}
        {backHref && (
          <Link href={backHref} className="button button-tertiary">
            Back to Band
          </Link>
        )}
      </div>

      {error && (
        <div className="alert alert-error chat-alert">
          <span>{error}</span>
          <button
            type="button"
            className="chat-icon-button"
            onClick={() => setError("")}
            aria-label="Dismiss"
          >
            <CloseIcon size={16} />
          </button>
        </div>
      )}

      <div className="chat-body">
        <div
          ref={containerRef}
          onScroll={onScroll}
          className={`chat-container${preview ? " chat-container-preview" : ""}${fullPage ? " chat-container-full-page" : ""}`}
        >
          {!compact && hasMore && (
            <button
              type="button"
              className="button button-small button-tertiary chat-load-older"
              onClick={handleLoadOlder}
              disabled={isLoadingOlder}
            >
              {isLoadingOlder ? "Loading..." : "Load earlier messages"}
            </button>
          )}

          {messages.length === 0 && pending.length === 0 ? (
            <div className="empty-state">
              No messages yet. Start the conversation!
            </div>
          ) : (
            displayMessages.map((msg, i) => {
              const prev = displayMessages[i - 1];
              const newDay =
                !prev || dayKey(prev.createdAt) !== dayKey(msg.createdAt);
              const grouped =
                !!prev &&
                !newDay &&
                prev.userId === msg.userId &&
                new Date(msg.createdAt).getTime() -
                  new Date(prev.createdAt).getTime() <
                  group_gap_ms;

              return (
                <div key={msg._id} className="chat-item">
                  {newDay && (
                    <div className="chat-day-divider">
                      <span>{dayLabel(msg.createdAt)}</span>
                    </div>
                  )}
                  <ChatMessageItem
                    message={msg}
                    currentUserId={currentUserId}
                    isOwn={msg.userId === currentUserId}
                    showHeader={!grouped}
                    isActive={activeId === msg._id}
                    isHighlighted={highlightId === msg._id}
                    handlers={handlers}
                  />
                </div>
              );
            })
          )}

          {pending.map((item) => (
            <PendingMessageItem
              key={item.tempId}
              item={item}
              onRetry={chat.retry}
              onDiscard={chat.discard}
            />
          ))}
        </div>

        {!isAtBottom && (
          <button
            type="button"
            className="chat-jump-bottom"
            onClick={() => scrollToBottom(true)}
            aria-label="Jump to latest messages"
          >
            <ArrowDownIcon />
            {unseen > 0 && <span className="chat-jump-badge">{unseen}</span>}
          </button>
        )}

        {notice && <div className="chat-notice">{notice}</div>}

        {isDragging && (
          <div className="chat-drop-overlay">Drop files to attach them</div>
        )}
      </div>

      <div className="chat-typing" aria-live="polite">
        {typingNames.length > 0 && (
          <>
            <span className="chat-typing-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            {typingText(typingNames)}
          </>
        )}
      </div>

      <div className="chat-composer-wrap">
        {reactingTo && (
          <ChatEmojiPicker
            title="React with"
            onSelect={(emoji) => {
              react(reactingTo, emoji);
              setReactingTo(null);
            }}
            onClose={() => setReactingTo(null)}
          />
        )}
        <ChatComposer
          ref={composerRef}
          replyTo={replyTo}
          editing={editing}
          onCancelReply={() => setReplyTo(null)}
          onCancelEdit={() => setEditing(null)}
          onSend={chat.send}
          onSaveEdit={chat.edit}
          onEditLast={editLast}
          onTyping={chat.notifyTyping}
          onError={setError}
        />
      </div>

      {lightbox && (
        <div
          className="chat-lightbox"
          role="dialog"
          aria-label={lightbox.name}
          onClick={() => setLightbox(null)}
        >
          <div className="chat-lightbox-actions">
            <a
              className="chat-icon-button"
              href={downloadUrl(lightbox.url)}
              download={lightbox.name}
              onClick={(e) => e.stopPropagation()}
              aria-label="Download"
              title="Download"
            >
              <DownloadIcon />
            </a>
            <button
              type="button"
              className="chat-icon-button"
              onClick={() => setLightbox(null)}
              aria-label="Close"
              title="Close"
            >
              <CloseIcon />
            </button>
          </div>
          <img
            src={lightbox.url}
            alt={lightbox.name}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}

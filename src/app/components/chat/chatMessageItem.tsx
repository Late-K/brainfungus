"use client";

// a single chat message bubble, with its reply quote, attachments, reactions
// and the hover/long-press toolbar for replying, reacting, editing and deleting

import AvatarImage from "@/app/components/ui/avatarImage";
import Link from "next/link";
import { Fragment, ReactNode, useEffect, useRef } from "react";
import {
  ChatMention,
  Message,
  MessageAttachment,
  MessageReplyPreview,
} from "@/app/types";
import { PendingMessage } from "@/app/hooks/useBandChat";
import {
  QUICK_REACTIONS,
  attachmentLabel,
  formatFileSize,
} from "@/app/lib/chatConfig";
import {
  MENTION_EVERYONE,
  mentionsUser,
  splitMentions,
} from "@/app/lib/chatMentions";
import ChatAttachment, {
  ChatGifPlayer,
} from "@/app/components/chat/chatAttachment";
import {
  CopyIcon,
  EditIcon,
  FileIcon,
  ReplyIcon,
  SmileIcon,
  TrashIcon,
} from "@/app/components/chat/chatIcons";

// touch: how long to hold a bubble to open its toolbar, and how far the
// finger can drift before it counts as a scroll instead
const LONG_PRESS_MS = 450;
const LONG_PRESS_SLOP_PX = 10;

const URL_PATTERN = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])/g;
// built at runtime since the ts target predates unicode property escapes
const EMOJI_ONLY = new RegExp(
  "^(?:\\p{Extended_Pictographic}|\\p{Emoji_Component}|\\u200d|\\ufe0f|\\s)+$",
  "u",
);

export function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFullDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// a message of just one to three emoji is shown bigger, like most messengers
function isEmojiOnly(text: string) {
  if (!text || text.length > 40 || !EMOJI_ONLY.test(text)) return false;
  if (/^[\d#*\s]+$/.test(text)) return false;
  const segments = [
    ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
      text.replace(/\s/g, ""),
    ),
  ];
  return segments.length <= 3;
}

function renderLinks(text: string): ReactNode {
  return text.split(URL_PATTERN).map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer">
        {part}
      </a>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

// @mentions link to that person's profile, and stand out more when they're you
function renderText(
  text: string,
  mentions?: ChatMention[],
  currentUserId?: string,
): ReactNode {
  return splitMentions(text, mentions).map(({ text: part, mention }, i) => {
    if (!mention) return <Fragment key={i}>{renderLinks(part)}</Fragment>;
    const isMe =
      mention.userId === currentUserId || mention.userId === MENTION_EVERYONE;
    const className = `chat-mention${isMe ? " chat-mention-me" : ""}`;
    return mention.userId === MENTION_EVERYONE ? (
      <span key={i} className={className}>
        {part}
      </span>
    ) : (
      <Link key={i} href={`/users/${mention.userId}`} className={className}>
        {part}
      </Link>
    );
  });
}

function Avatar({ name, image }: { name: string; image?: string | null }) {
  return image ? (
    <AvatarImage
      src={image}
      alt={name}
      width={32}
      height={32}
      className="chat-message-avatar"
    />
  ) : (
    <div className="chat-message-avatar chat-message-avatar-placeholder">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function ReplyQuote({
  reply,
  onJump,
}: {
  reply: MessageReplyPreview;
  onJump?: (id: string) => void;
}) {
  const body = reply.deleted
    ? "Message deleted"
    : reply.message || attachmentLabel(reply.attachmentKind);
  return (
    <button
      type="button"
      className="chat-reply-quote"
      onClick={(e) => {
        e.stopPropagation();
        if (!reply.deleted) onJump?.(reply._id);
      }}
      disabled={reply.deleted}
    >
      {!reply.deleted && (
        <span className="chat-reply-quote-name">{reply.userName}</span>
      )}
      <span className="chat-reply-quote-text">{body}</span>
    </button>
  );
}

function Attachments({
  attachments,
  onOpenImage,
  onMediaLoad,
}: {
  attachments: MessageAttachment[];
  onOpenImage?: (attachment: MessageAttachment) => void;
  onMediaLoad?: () => void;
}) {
  const media = attachments.filter(
    (a) => a.kind === "image" || a.kind === "video",
  );
  const others = attachments.filter(
    (a) => a.kind !== "image" && a.kind !== "video",
  );

  return (
    <>
      {media.length > 0 && (
        <div
          className={`chat-media-grid${media.length > 1 ? " chat-media-grid-multi" : ""}`}
        >
          {media.map((a) => (
            <ChatAttachment
              key={a.url}
              attachment={a}
              onOpenImage={onOpenImage}
              onMediaLoad={onMediaLoad}
            />
          ))}
        </div>
      )}
      {others.map((a) => (
        <ChatAttachment key={a.url} attachment={a} />
      ))}
    </>
  );
}

export interface ChatMessageHandlers {
  onActivate: (id: string | null) => void;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onMoreReactions: (messageId: string) => void;
  onJumpTo: (messageId: string) => void;
  onOpenImage: (attachment: MessageAttachment) => void;
  onMediaLoad: () => void;
  onCopied: () => void;
}

export default function ChatMessageItem({
  message,
  currentUserId,
  isOwn,
  showHeader,
  isActive,
  isHighlighted,
  handlers,
}: {
  message: Message;
  currentUserId: string;
  isOwn: boolean;
  showHeader: boolean;
  isActive: boolean;
  isHighlighted: boolean;
  handlers: ChatMessageHandlers;
}) {
  const attachments = message.attachments ?? [];
  const reactions = message.reactions ?? [];
  const mentionsMe =
    !isOwn && !message.deleted && mentionsUser(message.mentions, currentUserId);
  const bigEmoji = attachments.length === 0 && isEmojiOnly(message.message);
  const mediaOnly =
    !message.message &&
    !message.replyTo &&
    (attachments.length > 0 || !!message.gif) &&
    attachments.every((a) => a.kind === "image" || a.kind === "video");

  const pointerTypeRef = useRef("mouse");
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStartRef = useRef({ x: 0, y: 0 });
  // set once a long press opens the toolbar, so the tap that ends it is ignored
  const longPressedRef = useRef(false);

  const cancelPress = () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = null;
  };

  useEffect(() => cancelPress, []);

  const pressHandlers = {
    onPointerDown: (e: React.PointerEvent) => {
      pointerTypeRef.current = e.pointerType;
      longPressedRef.current = false;
      if (e.pointerType === "mouse" || message.deleted) return;
      pressStartRef.current = { x: e.clientX, y: e.clientY };
      cancelPress();
      pressTimerRef.current = setTimeout(() => {
        pressTimerRef.current = null;
        longPressedRef.current = true;
        navigator.vibrate?.(10);
        handlers.onActivate(message._id);
      }, LONG_PRESS_MS);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!pressTimerRef.current) return;
      const dx = e.clientX - pressStartRef.current.x;
      const dy = e.clientY - pressStartRef.current.y;
      if (Math.hypot(dx, dy) > LONG_PRESS_SLOP_PX) cancelPress();
    },
    onPointerUp: cancelPress,
    onPointerCancel: cancelPress,
    onPointerLeave: cancelPress,
    // stop the browser's own long-press menu / link preview on touch
    onContextMenu: (e: React.MouseEvent) => {
      if (pointerTypeRef.current !== "mouse") e.preventDefault();
    },
    // swallow the tap that ends a long press so it doesn't follow a link etc.
    onClickCapture: (e: React.MouseEvent) => {
      if (!longPressedRef.current) return;
      longPressedRef.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(message.message);
      handlers.onCopied();
    } catch {
      // clipboard access can be blocked, nothing useful to do about it
    }
    handlers.onActivate(null);
  };

  const rowClass = [
    "chat-row",
    isOwn && "chat-row-own",
    showHeader && "chat-row-first",
    isActive && "chat-row-active",
    isHighlighted && "chat-row-highlight",
    mentionsMe && "chat-row-mentioned",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div id={`chat-msg-${message._id}`} className={rowClass}>
      {!isOwn && (
        <div className="chat-row-avatar">
          {showHeader && (
            <Link
              href={`/users/${message.userId}`}
              className="chat-row-profile-link"
              aria-label={`View ${message.userName}'s profile`}
            >
              <Avatar name={message.userName} image={message.userImage} />
            </Link>
          )}
        </div>
      )}

      <div className="chat-row-content">
        {showHeader && !isOwn && (
          <Link href={`/users/${message.userId}`} className="chat-row-name">
            {message.userName}
          </Link>
        )}

        <div className="chat-bubble-line">
          <div
            className={`chat-bubble${bigEmoji ? " chat-bubble-emoji" : ""}${mediaOnly ? " chat-bubble-media" : ""}${message.deleted ? " chat-bubble-deleted" : ""}`}
            {...pressHandlers}
            onClick={(e) => {
              // touch opens the toolbar with a long press instead of a tap
              if (pointerTypeRef.current !== "mouse") return;
              // links, players and buttons inside the bubble keep their own clicks
              if (
                (e.target as HTMLElement).closest(
                  "a, button, audio, video, input",
                )
              ) {
                return;
              }
              if (!message.deleted)
                handlers.onActivate(isActive ? null : message._id);
            }}
            title={formatFullDate(message.createdAt)}
          >
            {message.deleted ? (
              <p className="chat-bubble-text">Message deleted</p>
            ) : (
              <>
                {message.replyTo && (
                  <ReplyQuote
                    reply={message.replyTo}
                    onJump={handlers.onJumpTo}
                  />
                )}
                {attachments.length > 0 && (
                  <Attachments
                    attachments={attachments}
                    onOpenImage={handlers.onOpenImage}
                    onMediaLoad={handlers.onMediaLoad}
                  />
                )}
                {message.gif && (
                  <div className="chat-media-grid">
                    <ChatGifPlayer
                      gif={message.gif}
                      onMediaLoad={handlers.onMediaLoad}
                    />
                  </div>
                )}
                {message.message && (
                  <p className="chat-bubble-text">
                    {renderText(
                      message.message,
                      message.mentions,
                      currentUserId,
                    )}
                  </p>
                )}
              </>
            )}
            <span className="chat-bubble-meta">
              {message.editedAt && !message.deleted && "edited · "}
              {formatMessageTime(message.createdAt)}
            </span>
          </div>

          {!message.deleted && (
            <div
              className="chat-toolbar"
              role="toolbar"
              aria-label="Message actions"
            >
              <button
                type="button"
                className="chat-icon-button chat-toolbar-react"
                title="React"
                aria-label="React"
                data-emoji-toggle
                onClick={() => handlers.onActivate(message._id)}
              >
                <SmileIcon />
              </button>
              <button
                type="button"
                className="chat-icon-button"
                title="Reply"
                aria-label="Reply"
                onClick={() => handlers.onReply(message)}
              >
                <ReplyIcon />
              </button>
              {message.message && (
                <button
                  type="button"
                  className="chat-icon-button"
                  title="Copy text"
                  aria-label="Copy text"
                  onClick={copyText}
                >
                  <CopyIcon />
                </button>
              )}
              {isOwn && (
                <>
                  <button
                    type="button"
                    className="chat-icon-button"
                    title="Edit"
                    aria-label="Edit"
                    onClick={() => handlers.onEdit(message)}
                  >
                    <EditIcon />
                  </button>
                  <button
                    type="button"
                    className="chat-icon-button chat-icon-button-danger"
                    title="Delete"
                    aria-label="Delete"
                    onClick={() => handlers.onDelete(message)}
                  >
                    <TrashIcon />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {isActive && !message.deleted && (
          <div className="chat-quick-reactions">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="chat-quick-reaction"
                onClick={() => {
                  handlers.onReact(message._id, emoji);
                  handlers.onActivate(null);
                }}
              >
                {emoji}
              </button>
            ))}
            <button
              type="button"
              className="chat-quick-reaction chat-quick-reaction-more"
              data-emoji-toggle
              onClick={() => handlers.onMoreReactions(message._id)}
              aria-label="More reactions"
            >
              +
            </button>
          </div>
        )}

        {reactions.length > 0 && (
          <div className="chat-reactions">
            {reactions.map((r) => {
              const mine = r.userIds.includes(currentUserId);
              const names = r.userIds.map((id, i) =>
                id === currentUserId ? "You" : r.userNames[i],
              );
              return (
                <button
                  key={r.emoji}
                  type="button"
                  className={`chat-reaction${mine ? " chat-reaction-mine" : ""}`}
                  title={names.join(", ")}
                  onClick={() => handlers.onReact(message._id, r.emoji)}
                >
                  <span>{r.emoji}</span>
                  <span className="chat-reaction-count">
                    {r.userIds.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// an own message that's still uploading / sending, or that failed
export function PendingMessageItem({
  item,
  onRetry,
  onDiscard,
}: {
  item: PendingMessage;
  onRetry: (tempId: string) => void;
  onDiscard: (tempId: string) => void;
}) {
  const failed = item.status === "failed";
  return (
    <div className="chat-row chat-row-own chat-row-pending">
      <div className="chat-row-content">
        <div className="chat-bubble-line">
          <div className={`chat-bubble${failed ? " chat-bubble-failed" : ""}`}>
            {item.replyTo && <ReplyQuote reply={item.replyTo} />}
            {item.gif && (
              <div className="chat-pending-attachments">
                <img src={item.gif.previewUrl} alt={item.gif.title} />
              </div>
            )}
            {item.attachments.length > 0 && (
              <div className="chat-pending-attachments">
                {item.attachments.map((a) =>
                  a.kind === "image" && a.previewUrl ? (
                    <img key={a.id} src={a.previewUrl} alt={a.file.name} />
                  ) : (
                    <span key={a.id} className="chat-pending-file">
                      <FileIcon />
                      <span>
                        {a.file.name} · {formatFileSize(a.file.size)}
                      </span>
                    </span>
                  ),
                )}
              </div>
            )}
            {item.text && (
              <p className="chat-bubble-text">
                {renderText(item.text, item.mentions)}
              </p>
            )}
            <span className="chat-bubble-meta">
              {failed
                ? "Not sent"
                : item.attachments.length > 0 && item.progress < 100
                  ? `Uploading ${item.progress}%`
                  : "Sending…"}
            </span>
          </div>
        </div>
        {failed && (
          <div className="chat-pending-actions">
            <span className="chat-pending-error">{item.error}</span>
            <button
              type="button"
              className="button button-small button-tertiary"
              onClick={() => onRetry(item.tempId)}
            >
              Retry
            </button>
            <button
              type="button"
              className="button button-small button-tertiary button-tertiary-danger"
              onClick={() => onDiscard(item.tempId)}
            >
              Discard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

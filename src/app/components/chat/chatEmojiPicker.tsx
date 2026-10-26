"use client";

// emoji grid for the band chat, used both for typing emoji into a message and
// for reacting with something beyond the quick reactions. in the message box
// it also has a tab that switches over to the gif picker

import { useEffect, useRef, useState } from "react";
import { EMOJI_CATEGORIES } from "@/app/lib/chatEmojis";
import { CloseIcon } from "@/app/components/chat/chatIcons";

const RECENT_KEY = "chat-recent-emoji";
const MAX_RECENT = 24;

function readRecent(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(stored) ? stored.filter((e) => typeof e === "string") : [];
  } catch {
    return [];
  }
}

function rememberEmoji(emoji: string) {
  try {
    const next = [emoji, ...readRecent().filter((e) => e !== emoji)].slice(
      0,
      MAX_RECENT,
    );
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // recent emoji are just a nicety
  }
}

export default function ChatEmojiPicker({
  title,
  onSelect,
  onClose,
  onShowGifs,
}: {
  title: string;
  onSelect: (emoji: string) => void;
  onClose: () => void;
  onShowGifs?: () => void;
}) {
  const [recent] = useState(readRecent);
  const [categoryId, setCategoryId] = useState(
    recent.length > 0 ? "recent" : EMOJI_CATEGORIES[0].id,
  );
  const panelRef = useRef<HTMLDivElement>(null);

  // close on escape or a click outside the picker
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (panelRef.current?.contains(target)) return;
      // the buttons that open the picker toggle it themselves
      if (target.closest("[data-emoji-toggle]")) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [onClose]);

  const categories = [
    ...(recent.length > 0
      ? [{ id: "recent", label: "Recent", icon: "🕘", emojis: recent }]
      : []),
    ...EMOJI_CATEGORIES,
  ];
  const active = categories.find((c) => c.id === categoryId) ?? categories[0];

  return (
    <div ref={panelRef} className="chat-emoji-picker" role="dialog" aria-label={title}>
      <div className="chat-emoji-picker-header">
        <span className="chat-emoji-picker-title">{title}</span>
        <button
          type="button"
          className="chat-icon-button"
          onClick={onClose}
          aria-label="Close emoji picker"
        >
          <CloseIcon size={16} />
        </button>
      </div>
      {/* the gif switch sits outside the scrolling categories so they can't
          slide underneath it */}
      <div className="chat-emoji-tabs-row">
        <div className="chat-emoji-tabs" role="tablist">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={category.id === active.id}
              title={category.label}
              className={`chat-emoji-tab${category.id === active.id ? " chat-emoji-tab-active" : ""}`}
              onClick={() => setCategoryId(category.id)}
            >
              {category.icon}
            </button>
          ))}
        </div>
        {onShowGifs && (
          <button
            type="button"
            title="GIFs"
            className="chat-emoji-tab chat-emoji-tab-gif"
            onClick={onShowGifs}
          >
            GIF
          </button>
        )}
      </div>
      <div className="chat-emoji-grid">
        {active.emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="chat-emoji-button"
            onClick={() => {
              rememberEmoji(emoji);
              onSelect(emoji);
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

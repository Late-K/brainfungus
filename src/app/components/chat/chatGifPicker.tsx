"use client";

// gif search for the band chat, powered by giphy through our /api/gifs route.
// shows what's trending until something is searched for

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatGif, GifSearchResponse } from "@/app/types";
import { CloseIcon, SmileIcon } from "@/app/components/chat/chatIcons";

const SEARCH_DELAY_MS = 300;
// how close to the bottom of the grid the next page starts loading
const LOAD_MORE_PX = 200;

export default function ChatGifPicker({
  onSelect,
  onClose,
  onShowEmoji,
}: {
  onSelect: (gif: ChatGif) => void;
  onClose: () => void;
  onShowEmoji?: () => void;
}) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<ChatGif[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<AbortController | null>(null);

  // close on escape or a click outside the picker
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (panelRef.current?.contains(target)) return;
      // the emoji button that opens the picker toggles it itself
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

  useEffect(() => {
    // touch keyboards would cover the trending gifs, so only focus on desktop
    if (window.matchMedia?.("(pointer: fine)").matches) {
      inputRef.current?.focus();
    }
    return () => requestRef.current?.abort();
  }, []);

  const load = useCallback(async (search: string, offset: number) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ offset: String(offset) });
      if (search) params.set("q", search);
      const res = await fetch(`/api/gifs?${params}`, {
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load GIFs");
      const page = data as GifSearchResponse;
      setGifs((prev) => {
        if (offset === 0) return page.gifs;
        // giphy pages can overlap, so skip anything already shown
        const seen = new Set(prev.map((g) => g.id));
        return [...prev, ...page.gifs.filter((g) => !seen.has(g.id))];
      });
      setNextOffset(page.nextOffset);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to load GIFs");
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, []);

  // wait for a pause in typing, then search again from the first page
  useEffect(() => {
    const search = input.trim();
    const timer = setTimeout(
      () => {
        setQuery(search);
        load(search, 0);
      },
      search ? SEARCH_DELAY_MS : 0,
    );
    return () => clearTimeout(timer);
  }, [input, load]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (
      !isLoading &&
      !error &&
      nextOffset !== null &&
      nextOffset > 0 &&
      el.scrollHeight - el.scrollTop - el.clientHeight < LOAD_MORE_PX
    ) {
      load(query, nextOffset);
    }
  };

  return (
    <div
      ref={panelRef}
      className="chat-emoji-picker chat-gif-picker"
      role="dialog"
      aria-label="GIFs"
    >
      <div className="chat-emoji-picker-header">
        {onShowEmoji && (
          <button
            type="button"
            className="chat-icon-button"
            onClick={onShowEmoji}
            aria-label="Back to emoji"
            title="Emoji"
          >
            <SmileIcon />
          </button>
        )}
        <input
          ref={inputRef}
          type="search"
          className="input chat-gif-search"
          placeholder="Search GIPHY"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Search GIFs"
          enterKeyHint="search"
          maxLength={100}
        />
        <button
          type="button"
          className="chat-icon-button"
          onClick={onClose}
          aria-label="Close GIF picker"
        >
          <CloseIcon size={16} />
        </button>
      </div>

      <div className="chat-gif-grid" onScroll={onScroll}>
        {gifs.map((gif) => (
          <button
            key={gif.id}
            type="button"
            className="chat-gif-option"
            onClick={() => onSelect(gif)}
            title={gif.title}
          >
            <img src={gif.previewUrl} alt={gif.title} loading="lazy" />
          </button>
        ))}
        {(error || isLoading || gifs.length === 0) && (
          <p className="chat-gif-status">
            {error
              ? error
              : isLoading
                ? "Loading GIFs…"
                : query
                  ? `No GIFs found for "${query}"`
                  : "No GIFs to show"}
          </p>
        )}
      </div>

      <div className="chat-gif-attribution">Powered by GIPHY</div>
    </div>
  );
}

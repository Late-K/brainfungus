"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { sendChatMessageAction } from "@/app/actions/bands";
import { Message } from "@/app/types";
import Link from "next/link";
import Image from "next/image";

const preview_count = 3;
const poll_ms = 3000;

export default function BandChatComponent({
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
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(
    async (options?: { showLoading?: boolean; signal?: AbortSignal }) => {
      if (!bandId) return;

      const { showLoading = false, signal } = options ?? {};

      try {
        if (showLoading) setIsLoading(true);
        setError("");

        const res = await fetch(`/api/bands/${bandId}/chat`, { signal });

        if (!res.ok) {
          throw new Error("Failed to fetch messages");
        }

        const data = await res.json();
        if (signal?.aborted) return;

        const nextMessages: Message[] = data.messages || [];
        setMessages((prev) => {
          if (
            prev.length === nextMessages.length &&
            prev.at(-1)?._id === nextMessages.at(-1)?._id
          ) {
            return prev;
          }
          return nextMessages;
        });
      } catch (err) {
        if (signal?.aborted) return;
        setError(
          err instanceof Error ? err.message : "Failed to load messages",
        );
      } finally {
        if (showLoading && !signal?.aborted) setIsLoading(false);
      }
    },
    [bandId],
  );

  // fetch initial messages
  useEffect(() => {
    if (!bandId) return;
    const controller = new AbortController();
    fetchMessages({ showLoading: true, signal: controller.signal });
    return () => controller.abort();
  }, [bandId, fetchMessages]);

  // poll for new messages (skip in preview and when tab is hidden)
  useEffect(() => {
    if (!bandId || preview) return;

    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetchMessages();
    }, poll_ms);

    return () => clearInterval(interval);
  }, [bandId, preview, fetchMessages]);

  // auto-scroll to bottom when not in preview mode
  useEffect(() => {
    if (!preview && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, preview]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    try {
      setIsSending(true);
      setError("");

      const result = await sendChatMessageAction(bandId, newMessage);

      setMessages((prev) => [...prev, result.message]);
      setNewMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const displayMessages = preview ? messages.slice(-preview_count) : messages;

  if (isLoading) {
    return (
      <section className="card">
        <div className="section-header">
          <h2>Band Chat</h2>
        </div>
        <p className="empty-state">Loading chat...</p>
      </section>
    );
  }

  return (
    <section className={`card${fullPage ? " card-fill-page" : ""}`}>
      <div className="section-header">
        <h2>Band Chat</h2>
        {preview && (
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

      {error && <p className="alert alert-error">{error}</p>}

      <div
        ref={containerRef}
        className={`chat-container${preview ? " chat-container-preview" : ""}${fullPage ? " chat-container-full-page" : ""}`}
      >
        {messages.length === 0 ? (
          <div className="empty-state">
            No messages yet. Start the conversation!
          </div>
        ) : (
          displayMessages.map((msg) => {
            const isOwn = msg.userEmail === session?.user?.email;
            return (
              <div
                key={msg._id}
                className={`chat-message${isOwn ? " chat-message-own" : ""}`}
              >
                <div className="chat-message-body">
                  {msg.userImage ? (
                    <Image
                      src={msg.userImage}
                      alt={msg.userName}
                      width={32}
                      height={32}
                      className="chat-message-avatar"
                    />
                  ) : (
                    <div className="chat-message-avatar chat-message-avatar-placeholder">
                      {msg.userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="chat-message-content">
                    <div className="chat-message-meta">
                      <strong className="chat-message-name">
                        {msg.userName}
                      </strong>
                      <span className="chat-message-time meta-text">
                        {new Date(msg.createdAt).toLocaleString("en-GB", {
                          timeZone: "Europe/London",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="chat-message-text">{msg.message}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSendMessage} className="chat-form">
        <input
          type="text"
          className="input"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={isSending}
        />
        <button
          type="submit"
          className="button button-primary"
          disabled={isSending || !newMessage.trim()}
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
}

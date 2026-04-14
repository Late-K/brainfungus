"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { sendChatMessageAction } from "@/app/actions/bands";
import { Message } from "@/app/types";
import Link from "next/link";

const PREVIEW_COUNT = 3;

export default function BandChatComponent({
  bandId,
  preview = false,
  fullPage = false,
}: {
  bandId: string;
  preview?: boolean;
  fullPage?: boolean;
}) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // fetch initial messages
  useEffect(() => {
    async function fetchMessages() {
      try {
        setIsLoading(true);
        setError("");

        const res = await fetch(`/api/bands/${bandId}/chat`);

        if (!res.ok) {
          throw new Error("Failed to fetch messages");
        }

        const data = await res.json();
        setMessages(data.messages || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load messages",
        );
      } finally {
        setIsLoading(false);
      }
    }

    if (bandId) {
      fetchMessages();
    }
  }, [bandId]);

  // poll for new messages every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/bands/${bandId}/chat`);

        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error("Failed to refresh messages:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [bandId]);

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

      setMessages([...messages, result.message]);
      setNewMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const displayMessages = preview ? messages.slice(-PREVIEW_COUNT) : messages;

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
    <section className={`card${fullPage ? " card--fullpage-chat" : ""}`}>
      <div className="section-header">
        <h2>Band Chat</h2>
        {preview && (
          <Link href={`/bands/${bandId}/chat`} className="btn btn--primary">
            View All
          </Link>
        )}
      </div>

      {error && <p className="alert alert--error">{error}</p>}

      <div
        ref={containerRef}
        className={`chat-container${preview ? " chat-container--preview" : ""}${fullPage ? " chat-container--fullpage" : ""}`}
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
                className={`chat-message${isOwn ? " chat-message--own" : ""}`}
              >
                <div className="chat-message-meta">
                  <strong className="chat-message-name">{msg.userName}</strong>
                  <span className="chat-message-time">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="chat-message-text">{msg.message}</p>
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
          className="btn btn--primary"
          disabled={isSending || !newMessage.trim()}
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
}

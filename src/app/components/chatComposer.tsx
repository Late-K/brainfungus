"use client";

// the band chat's message box: text with emoji, attachments (picked, pasted
// or dropped onto the chat), voice notes, and the replying / editing banners

import {
  Ref,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Message } from "@/app/types";
import { DraftAttachment, SendInput } from "@/app/hooks/useBandChat";
import { useVoiceRecorder } from "@/app/hooks/useVoiceRecorder";
import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  MAX_MESSAGE_LENGTH,
  attachmentKindFor,
  attachmentLabel,
  formatDuration,
  formatFileSize,
} from "@/app/lib/chatConfig";
import ChatEmojiPicker from "@/app/components/chatEmojiPicker";
import {
  CloseIcon,
  FileIcon,
  MicIcon,
  PaperclipIcon,
  SendIcon,
  SmileIcon,
} from "@/app/components/chatIcons";

export interface ChatComposerHandle {
  addFiles: (files: File[]) => void;
  focus: () => void;
}

// reads what we can about a file before it's sent: a preview for photos and
// videos, their size so the chat can save room for them, and audio length
async function prepareAttachment(file: File): Promise<DraftAttachment> {
  const kind = attachmentKindFor(file.type);
  const draft: DraftAttachment = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    file,
    kind,
  };
  if (kind === "file") return draft;

  const url = URL.createObjectURL(file);
  if (kind === "image") {
    draft.previewUrl = url;
    await new Promise<void>((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        draft.width = img.naturalWidth;
        draft.height = img.naturalHeight;
        resolve();
      };
      img.onerror = () => resolve();
      img.src = url;
    });
    return draft;
  }

  await new Promise<void>((resolve) => {
    const media = document.createElement(kind === "video" ? "video" : "audio");
    media.preload = "metadata";
    media.onloadedmetadata = () => {
      if (Number.isFinite(media.duration)) draft.duration = media.duration;
      if (media instanceof HTMLVideoElement && media.videoWidth) {
        draft.width = media.videoWidth;
        draft.height = media.videoHeight;
      }
      resolve();
    };
    media.onerror = () => resolve();
    media.src = url;
  });
  if (kind === "video") draft.previewUrl = url;
  else URL.revokeObjectURL(url);
  return draft;
}

function isTouchDevice() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(pointer: coarse)").matches
  );
}

export default function ChatComposer({
  ref,
  replyTo,
  editing,
  onCancelReply,
  onCancelEdit,
  onSend,
  onSaveEdit,
  onEditLast,
  onTyping,
  onError,
}: {
  ref?: Ref<ChatComposerHandle>;
  replyTo: Message | null;
  editing: Message | null;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onSend: (input: SendInput) => void;
  onSaveEdit: (messageId: string, text: string) => Promise<void>;
  onEditLast: () => void;
  onTyping: () => void;
  onError: (message: string) => void;
}) {
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<DraftAttachment[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftsRef = useRef(drafts);
  const recorder = useVoiceRecorder();

  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  // free previews of anything still in the box when the chat closes
  useEffect(
    () => () => {
      for (const d of draftsRef.current) {
        if (d.previewUrl) URL.revokeObjectURL(d.previewUrl);
      }
    },
    [],
  );

  const { error: recorderError, setError: setRecorderError } = recorder;
  useEffect(() => {
    if (recorderError) {
      onError(recorderError);
      setRecorderError("");
    }
  }, [recorderError, setRecorderError, onError]);

  // switching into edit mode loads that message's text into the box
  const [editingId, setEditingId] = useState<string | null>(null);
  if ((editing?._id ?? null) !== editingId) {
    setEditingId(editing?._id ?? null);
    setText(editing ? editing.message : "");
  }

  useEffect(() => {
    if (editing || replyTo) textareaRef.current?.focus();
  }, [editing, replyTo]);

  // grow the box with its content, up to a few lines
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const addFiles = async (files: File[]) => {
    if (editing) return;
    const room = MAX_ATTACHMENTS - draftsRef.current.length;
    if (files.length > room) {
      onError(`You can send up to ${MAX_ATTACHMENTS} files at once`);
    }
    const accepted = files.slice(0, Math.max(0, room)).filter((file) => {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        onError(
          `${file.name} is too large - max ${formatFileSize(MAX_ATTACHMENT_BYTES)}`,
        );
        return false;
      }
      return true;
    });
    if (accepted.length === 0) return;
    const prepared = await Promise.all(accepted.map(prepareAttachment));
    setDrafts((prev) => [...prev, ...prepared]);
    textareaRef.current?.focus();
  };

  useImperativeHandle(ref, () => ({
    addFiles,
    focus: () => textareaRef.current?.focus(),
  }));

  const removeDraft = (id: string) => {
    setDrafts((prev) => {
      const removed = prev.find((d) => d.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((d) => d.id !== id);
    });
  };

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const trimmed = text.trim();
  const canSend = editing
    ? !isSaving && (trimmed.length > 0 || (editing.attachments?.length ?? 0) > 0)
    : trimmed.length > 0 || drafts.length > 0;

  const submit = async () => {
    if (!canSend) return;
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      onError(`Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`);
      return;
    }

    if (editing) {
      setIsSaving(true);
      try {
        await onSaveEdit(editing._id, trimmed);
        onCancelEdit();
      } catch (err) {
        onError(err instanceof Error ? err.message : "Failed to edit message");
      } finally {
        setIsSaving(false);
      }
      return;
    }

    onSend({ text: trimmed, replyTo, attachments: drafts });
    setText("");
    setDrafts([]);
    setShowEmoji(false);
    onCancelReply();
    textareaRef.current?.focus();
  };

  const sendVoiceNote = async () => {
    const recording = await recorder.stop();
    if (!recording) return;
    onSend({
      text: "",
      replyTo,
      attachments: [
        {
          id: `voice-${Date.now()}`,
          file: recording.file,
          kind: "audio",
          duration: recording.duration,
        },
      ],
    });
    onCancelReply();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isTouchDevice()) {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      if (editing) onCancelEdit();
      else if (replyTo) onCancelReply();
    } else if (e.key === "ArrowUp" && !text && drafts.length === 0 && !editing) {
      e.preventDefault();
      onEditLast();
    }
  };

  const banner = editing
    ? { label: "Editing message", body: editing.message, onCancel: onCancelEdit }
    : replyTo
      ? {
          label: `Replying to ${replyTo.userName}`,
          body:
            replyTo.message || attachmentLabel(replyTo.attachments?.[0]?.kind),
          onCancel: onCancelReply,
        }
      : null;

  return (
    <div className="chat-composer">
      {showEmoji && (
        <ChatEmojiPicker
          title="Emoji"
          onSelect={insertEmoji}
          onClose={() => setShowEmoji(false)}
        />
      )}

      {banner && (
        <div className="chat-composer-banner">
          <div className="chat-composer-banner-text">
            <strong>{banner.label}</strong>
            <span>{banner.body}</span>
          </div>
          <button
            type="button"
            className="chat-icon-button"
            onClick={banner.onCancel}
            aria-label="Cancel"
          >
            <CloseIcon size={16} />
          </button>
        </div>
      )}

      {drafts.length > 0 && (
        <div className="chat-drafts">
          {drafts.map((draft) => (
            <div key={draft.id} className="chat-draft">
              {draft.kind === "image" && draft.previewUrl ? (
                <img src={draft.previewUrl} alt={draft.file.name} />
              ) : draft.kind === "video" && draft.previewUrl ? (
                <video src={draft.previewUrl} muted />
              ) : (
                <div className="chat-draft-file">
                  <FileIcon />
                  <span className="chat-draft-file-name">{draft.file.name}</span>
                  <span className="chat-draft-file-size">
                    {draft.kind === "audio" && draft.duration
                      ? formatDuration(draft.duration)
                      : formatFileSize(draft.file.size)}
                  </span>
                </div>
              )}
              <button
                type="button"
                className="chat-draft-remove"
                onClick={() => removeDraft(draft.id)}
                aria-label={`Remove ${draft.file.name}`}
              >
                <CloseIcon size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {recorder.isRecording ? (
        <div className="chat-composer-row chat-recording">
          <button
            type="button"
            className="chat-icon-button chat-icon-button-danger"
            onClick={recorder.cancel}
            aria-label="Cancel voice note"
            title="Cancel"
          >
            <CloseIcon />
          </button>
          <span className="chat-recording-dot" aria-hidden="true" />
          <span className="chat-recording-time">
            {formatDuration(recorder.elapsed)}
          </span>
          <span className="chat-recording-label">Recording voice note…</span>
          <button
            type="button"
            className="chat-send-button"
            onClick={sendVoiceNote}
            aria-label="Send voice note"
            title="Send voice note"
          >
            <SendIcon />
          </button>
        </div>
      ) : (
        <div className="chat-composer-row">
          {!editing && (
            <button
              type="button"
              className="chat-icon-button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach files"
              title="Attach photos, videos, audio or files"
            >
              <PaperclipIcon />
            </button>
          )}
          <button
            type="button"
            className={`chat-icon-button${showEmoji ? " chat-icon-button-active" : ""}`}
            data-emoji-toggle
            onClick={() => setShowEmoji((v) => !v)}
            aria-label="Emoji"
            title="Emoji"
          >
            <SmileIcon />
          </button>
          <textarea
            ref={textareaRef}
            className="input chat-composer-input"
            rows={1}
            value={text}
            placeholder={editing ? "Edit your message" : "Message"}
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value.trim() && !editing) onTyping();
            }}
            onKeyDown={onKeyDown}
            onPaste={(e) => {
              const files = Array.from(e.clipboardData.files);
              if (files.length > 0 && !editing) {
                e.preventDefault();
                addFiles(files);
              }
            }}
          />
          {canSend || editing ? (
            <button
              type="button"
              className="chat-send-button"
              onClick={submit}
              disabled={!canSend}
              aria-label={editing ? "Save edit" : "Send"}
              title={editing ? "Save" : "Send"}
            >
              <SendIcon />
            </button>
          ) : (
            <button
              type="button"
              className="chat-send-button"
              onClick={recorder.start}
              aria-label="Record voice note"
              title="Record voice note"
            >
              <MicIcon />
            </button>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          addFiles(files);
        }}
      />
    </div>
  );
}

// band chat limits and helpers shared by the browser and the server.
// keep this free of server-only imports so client components can use it

import { ChatAttachmentKind } from "@/app/types";

export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_ATTACHMENTS = 10;
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB
export const CHAT_PAGE_SIZE = 50;
export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

// only these are shown inline in the chat. anything else (svg, html, pdf...)
// is treated as a plain file and always downloaded rather than rendered
const INLINE_TYPES: Record<Exclude<ChatAttachmentKind, "file">, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],
  video: ["video/mp4", "video/webm", "video/quicktime", "video/ogg"],
  audio: [
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/x-m4a",
    "audio/m4a",
    "audio/aac",
    "audio/wav",
    "audio/x-wav",
    "audio/wave",
    "audio/ogg",
    "audio/webm",
    "audio/flac",
    "audio/x-flac",
  ],
};

// strips parameters, e.g. "audio/webm;codecs=opus" -> "audio/webm"
export function baseMimeType(mimeType: string | undefined | null) {
  return (mimeType || "").split(";")[0].trim().toLowerCase();
}

export function attachmentKindFor(mimeType: string): ChatAttachmentKind {
  const type = baseMimeType(mimeType);
  for (const kind of ["image", "video", "audio"] as const) {
    if (INLINE_TYPES[kind].includes(type)) return kind;
  }
  return "file";
}

export function chatUploadPrefix(bandId: string) {
  return `chat/${bandId}/`;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(seconds: number | undefined) {
  if (seconds === undefined || !Number.isFinite(seconds)) return "0:00";
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function attachmentLabel(kind: ChatAttachmentKind | undefined) {
  switch (kind) {
    case "image":
      return "📷 Photo";
    case "video":
      return "🎬 Video";
    case "audio":
      return "🎤 Audio";
    case "file":
      return "📎 File";
    default:
      return "";
  }
}

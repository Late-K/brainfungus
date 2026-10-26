"use client";

// one attachment inside a chat message: a photo, video, audio clip / voice
// note, or a file to download

import { useEffect, useRef, useState } from "react";
import { MessageAttachment } from "@/app/types";
import { formatFileSize } from "@/app/lib/chatConfig";
import { formatDuration } from "@/app/lib/setlistUtils";
import {
  DownloadIcon,
  FileIcon,
  PauseIcon,
  PlayIcon,
} from "@/app/components/chat/chatIcons";

export function downloadUrl(url: string) {
  return `${url}${url.includes("?") ? "&" : "?"}download=1`;
}

// recorded voice notes often don't report a length until they've fully
// played, so fall back to the duration measured when they were recorded
function ChatAudioPlayer({ attachment }: { attachment: MessageAttachment }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [mediaDuration, setMediaDuration] = useState<number | undefined>();
  const duration = mediaDuration ?? attachment.duration ?? 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrent(audio.currentTime);
    const onMeta = () => {
      if (Number.isFinite(audio.duration)) setMediaDuration(audio.duration);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrent(0);
    };
    const onPause = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      // only one clip plays at a time
      document.querySelectorAll("audio").forEach((other) => {
        if (other !== audio) other.pause();
      });
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = value;
    setCurrent(value);
  };

  const isVoiceNote = attachment.name.startsWith("voice-note-");

  return (
    <div className="chat-audio">
      <audio ref={audioRef} src={attachment.url} preload="metadata" />
      <button
        type="button"
        className="chat-audio-play"
        onClick={toggle}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      <div className="chat-audio-body">
        {!isVoiceNote && (
          <span className="chat-audio-name" title={attachment.name}>
            {attachment.name}
          </span>
        )}
        <input
          type="range"
          className="chat-audio-seek"
          min={0}
          max={duration || 1}
          step={0.1}
          value={Math.min(current, duration || 1)}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Seek"
        />
        <span className="chat-audio-time">
          {isPlaying || current > 0
            ? `${formatDuration(current)} / ${formatDuration(duration)}`
            : formatDuration(duration)}
        </span>
      </div>
    </div>
  );
}

export default function ChatAttachment({
  attachment,
  onOpenImage,
  onMediaLoad,
}: {
  attachment: MessageAttachment;
  onOpenImage?: (attachment: MessageAttachment) => void;
  onMediaLoad?: () => void;
}) {
  const sized =
    attachment.width && attachment.height
      ? { aspectRatio: `${attachment.width} / ${attachment.height}` }
      : undefined;

  switch (attachment.kind) {
    case "image":
      return (
        <button
          type="button"
          className="chat-attachment-image"
          onClick={() => onOpenImage?.(attachment)}
          aria-label={`Open ${attachment.name}`}
        >
          <img
            src={attachment.url}
            alt={attachment.name}
            style={sized}
            loading="lazy"
            onLoad={onMediaLoad}
          />
        </button>
      );
    case "video":
      return (
        <video
          className="chat-attachment-video"
          src={attachment.url}
          style={sized}
          controls
          preload="metadata"
          playsInline
          onLoadedMetadata={onMediaLoad}
        />
      );
    case "audio":
      return <ChatAudioPlayer attachment={attachment} />;
    default:
      return (
        <a
          className="chat-attachment-file"
          href={downloadUrl(attachment.url)}
          download={attachment.name}
        >
          <span className="chat-attachment-file-icon">
            <FileIcon />
          </span>
          <span className="chat-attachment-file-info">
            <span className="chat-attachment-file-name">{attachment.name}</span>
            <span className="chat-attachment-file-size">
              {formatFileSize(attachment.size)}
            </span>
          </span>
          <DownloadIcon />
        </a>
      );
  }
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// deezer preview links expire about 15 minutes after they're issued, so a
// player can need a fresh one more than once on a page left open (e.g. a
// setlist during rehearsal) - but a track that keeps failing straight after
// a refresh is treated as unavailable rather than retried forever
const REFRESH_COOLDOWN_MS = 30_000;

interface SongAudioPlayerProps {
  src?: string | null;
  deezerTrackId?: string | null;
  unavailableLabel?: string;
}

export default function SongAudioPlayer({
  src,
  deezerTrackId,
  unavailableLabel = "Audio unavailable",
}: SongAudioPlayerProps) {
  const [audioSrc, setAudioSrc] = useState<string>("");
  const [hasLoadError, setHasLoadError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastRefreshRef = useRef(0);
  // keep playing after swapping in a fresh link if the old one failed mid-play
  const resumeRef = useRef(false);
  const trimmedSrc = useMemo(() => src?.trim(), [src]);
  const trimmedTrackId = useMemo(() => deezerTrackId?.trim(), [deezerTrackId]);

  useEffect(() => {
    setAudioSrc(trimmedSrc || "");
    setHasLoadError(false);
    setIsRefreshing(false);
    lastRefreshRef.current = 0;
    resumeRef.current = false;
  }, [trimmedSrc, trimmedTrackId]);

  useEffect(() => {
    if (!resumeRef.current) return;
    resumeRef.current = false;
    audioRef.current?.play().catch(() => {});
  }, [audioSrc]);

  const refreshPreview = async (resume: boolean) => {
    if (
      !trimmedTrackId ||
      Date.now() - lastRefreshRef.current < REFRESH_COOLDOWN_MS
    ) {
      setHasLoadError(true);
      return;
    }

    try {
      setIsRefreshing(true);
      lastRefreshRef.current = Date.now();

      const res = await fetch(
        `/api/deezer/track?id=${encodeURIComponent(trimmedTrackId)}`,
      );

      if (!res.ok) {
        throw new Error("Failed to refresh Deezer preview");
      }

      const data = await res.json();
      const refreshedPreview =
        typeof data?.track?.preview === "string"
          ? data.track.preview.trim()
          : "";

      if (!refreshedPreview) {
        throw new Error("No refreshed preview available");
      }

      resumeRef.current = resume;
      setAudioSrc(refreshedPreview);
      setHasLoadError(false);
    } catch {
      setHasLoadError(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!audioSrc) {
    return null;
  }

  if (hasLoadError) {
    return (
      <p className="meta-text meta-text-small margin-top">{unavailableLabel}</p>
    );
  }

  return (
    <audio
      ref={audioRef}
      controls
      src={audioSrc}
      className="song-audio"
      onError={(e) => {
        if (!isRefreshing) {
          void refreshPreview(!e.currentTarget.paused);
        }
      }}
    />
  );
}

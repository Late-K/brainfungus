"use client";

import { useEffect, useMemo, useState } from "react";

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
  const [hasRetried, setHasRetried] = useState(false);
  const trimmedSrc = useMemo(() => src?.trim(), [src]);
  const trimmedTrackId = useMemo(() => deezerTrackId?.trim(), [deezerTrackId]);

  useEffect(() => {
    setAudioSrc(trimmedSrc || "");
    setHasLoadError(false);
    setIsRefreshing(false);
    setHasRetried(false);
  }, [trimmedSrc, trimmedTrackId]);

  const refreshPreview = async () => {
    if (!trimmedTrackId || hasRetried) {
      setHasLoadError(true);
      return;
    }

    try {
      setIsRefreshing(true);
      setHasRetried(true);

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
      controls
      src={audioSrc}
      className="song-audio"
      onError={() => {
        if (!isRefreshing) {
          void refreshPreview();
        }
      }}
    />
  );
}

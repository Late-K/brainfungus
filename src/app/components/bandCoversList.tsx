"use client";

import { useEffect, useState } from "react";
import { BandCover } from "@/app/types";

interface BandCoversListProps {
  bandId: string;
  selectedSongs: Array<{ id: string; isCover?: boolean }>;
  onToggleCover: (cover: BandCover) => void;
}

export default function BandCoversList({
  bandId,
  selectedSongs,
  onToggleCover,
}: BandCoversListProps) {
  const [covers, setCovers] = useState<BandCover[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCovers = async () => {
      try {
        setIsLoading(true);
        setError("");

        const res = await fetch(`/api/covers?bandId=${bandId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch covers");
        }

        const data = await res.json();
        setCovers(data.covers || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load covers");
      } finally {
        setIsLoading(false);
      }
    };

    if (bandId) {
      fetchCovers();
    }
  }, [bandId]);

  if (isLoading) {
    return <p>Loading covers...</p>;
  }

  if (covers.length === 0) {
    return null;
  }

  const selectedSongIds = selectedSongs.map((song) => song.id);

  return (
    <section className="card">
      <h3>Your Band Covers</h3>

      {error && <p className="alert alert--error">{error}</p>}

      <div className="songs-grid">
        {covers.map((cover) => (
          <div key={cover._id} className="song-checkbox">
            <label>
              <input
                type="checkbox"
                checked={selectedSongIds.includes(cover.songId)}
                onChange={() => onToggleCover(cover)}
              />
              <div className="song-details">
                <span className="item-title">{cover.title}</span>
                <span className="meta-text meta-text-small margin-top">
                  {cover.artist}
                  {cover.album ? ` - ${cover.album}` : ""}
                </span>
              </div>
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}

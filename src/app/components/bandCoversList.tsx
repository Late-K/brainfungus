"use client";

import { useState } from "react";

import { BandCover } from "@/app/types";
import SongInfo from "@/app/components/songInfo";
import { useFetchData } from "@/app/hooks/useFetchData";

interface BandCoversListProps {
  bandId: string;
  title?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  selectedSongs: Array<{ id: string; isCover?: boolean }>;
  onToggleCover: (cover: BandCover) => void;
}

export default function BandCoversList({
  bandId,
  title = "Your Band Covers",
  collapsible = false,
  defaultOpen = true,
  selectedSongs,
  onToggleCover,
}: BandCoversListProps) {
  const { data, isLoading, error } = useFetchData<{ covers: BandCover[] }>(
    bandId ? `/api/covers?bandId=${bandId}` : null,
  );
  const covers = data?.covers ?? [];
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (isLoading) {
    return <p>Loading covers...</p>;
  }

  if (covers.length === 0) {
    return null;
  }

  const selectedSongIds = selectedSongs.map((song) => song.id);

  return (
    <section className="card">
      {collapsible ? (
        <button
          type="button"
          className="accordion-trigger"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <span
            className={`accordion-icon ${isOpen ? "accordion-icon-open" : ""}`}
          >
            &#9654;
          </span>
          <span className="accordion-title">{title}</span>
          <span className="accordion-count">
            {covers.length} song{covers.length !== 1 ? "s" : ""}
          </span>
        </button>
      ) : (
        <h3>{title}</h3>
      )}

      {error && <p className="alert alert-error">{error}</p>}

      {isOpen && (
        <div className="songs-grid">
          {covers.map((cover) => (
            <div key={cover._id} className="song-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={selectedSongIds.includes(cover.songId)}
                  onChange={() => onToggleCover(cover)}
                />
                <SongInfo
                  image={cover.image}
                  imageAlt={cover.title}
                  title={cover.title}
                  meta={`${cover.artist}${cover.album ? ` - ${cover.album}` : ""}`}
                  containerClassName="song-details"
                  metaClassName="meta-text meta-text-small margin-top"
                />
              </label>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

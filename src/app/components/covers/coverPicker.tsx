"use client";

import { useState } from "react";

import { BandCover } from "@/app/types";
import SongInfo from "@/app/components/songs/songInfo";
import { useFetchData } from "@/app/hooks/useFetchData";
import PickerHeader, {
  PickerShowLess,
} from "@/app/components/songs/pickerHeader";

interface CoverPickerProps {
  bandId: string;
  title?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  selectedSongs: Array<{ id: string; isCover?: boolean }>;
  onToggleCover: (cover: BandCover) => void;
}

export default function CoverPicker({
  bandId,
  title = "Your Band Covers",
  collapsible = false,
  defaultOpen = true,
  selectedSongs,
  onToggleCover,
}: CoverPickerProps) {
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
    <section className="card picker">
      <PickerHeader
        title={title}
        total={covers.length}
        collapsible={collapsible}
        isOpen={isOpen}
        onToggle={() => setIsOpen((prev) => !prev)}
      />

      {error && <p className="alert alert-error">{error}</p>}

      {isOpen && (
        <div className="songs-grid picker-list">
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
                  meta={
                    cover.isCustom
                      ? `Custom song from ${cover.artist}`
                      : `${cover.artist}${cover.album ? ` - ${cover.album}` : ""}`
                  }
                  containerClassName="song-details"
                  metaClassName="meta-text meta-text-small margin-top"
                />
              </label>
            </div>
          ))}
        </div>
      )}
      <PickerShowLess
        collapsible={collapsible}
        isOpen={isOpen}
        onCollapse={() => setIsOpen(false)}
      />
    </section>
  );
}

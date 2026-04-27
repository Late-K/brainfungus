"use client";

import { BandCover } from "@/app/types";
import SongInfo from "@/app/components/songInfo";
import { useFetchData } from "@/app/hooks/useFetchData";

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
  const { data, isLoading, error } = useFetchData<{ covers: BandCover[] }>(
    bandId ? `/api/covers?bandId=${bandId}` : null,
  );
  const covers = data?.covers ?? [];

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

      {error && <p className="alert alert-error">{error}</p>}

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
    </section>
  );
}

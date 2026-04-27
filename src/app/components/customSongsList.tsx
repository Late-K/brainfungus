"use client";

import { useState } from "react";
import { CustomSong } from "@/app/types";
import { useFetchData } from "@/app/hooks/useFetchData";

interface CustomSongsListProps {
  bandId: string;
  selectedSongs: Array<{
    id: string;
    title: string;
    isCustom?: boolean;
  }>;
  onToggleSong: (songId: string, title: string, duration?: number) => void;
  onToggleAlbum?: (
    albumName: string,
    songs: Array<{ id: string; title: string; duration?: number }>,
  ) => void;
}

export default function CustomSongsList({
  bandId,
  selectedSongs,
  onToggleSong,
  onToggleAlbum,
}: CustomSongsListProps) {
  const { data, isLoading, error } = useFetchData<{ songs: CustomSong[] }>(
    bandId ? `/api/songs?bandId=${bandId}` : null,
  );
  const customSongs = data?.songs ?? [];
  const [expandedAlbums, setExpandedAlbums] = useState<Set<string>>(new Set());

  if (isLoading) {
    return <p>Loading custom songs...</p>;
  }

  if (customSongs.length === 0) {
    return null;
  }

  const selectedCustomSongIds = selectedSongs
    .filter((s) => s.isCustom)
    .map((s) => s.id);

  const toggleAlbum = (albumName: string) => {
    setExpandedAlbums((prev) => {
      const next = new Set(prev);
      if (next.has(albumName)) {
        next.delete(albumName);
      } else {
        next.add(albumName);
      }
      return next;
    });
  };

  const groupedSongs = customSongs.reduce<Record<string, CustomSong[]>>(
    (acc, song) => {
      const key = song.album || "";
      if (!acc[key]) acc[key] = [];
      acc[key].push(song);
      return acc;
    },
    {},
  );

  const looseSongs = groupedSongs[""] || [];
  const albums = Object.entries(groupedSongs).filter(([key]) => key !== "");

  const isAlbumSelected = (songs: CustomSong[]) =>
    songs.every((song) => selectedCustomSongIds.includes(song._id));

  const renderSongCheckbox = (song: CustomSong) => (
    <div key={song._id} className="song-checkbox">
      <label>
        <input
          type="checkbox"
          checked={selectedCustomSongIds.includes(song._id)}
          onChange={() => onToggleSong(song._id, song.title, song.duration)}
        />
        <div className="song-details">
          <span className="item-title">{song.title}</span>
          {song.notes && (
            <span className="meta-text meta-text-small margin-top">
              {song.notes}
            </span>
          )}
        </div>
      </label>
    </div>
  );

  return (
    <section className="card">
      <h3>Your Custom Songs</h3>

      {error && <p className="alert alert-error">{error}</p>}

      <div className="songs-grid">
        {albums.map(([albumName, albumSongs]) => {
          const allSelected = isAlbumSelected(albumSongs);

          return (
            <div key={albumName} className="accordion">
              <div className="accordion-header">
                <button
                  type="button"
                  className="accordion-trigger"
                  onClick={() => toggleAlbum(albumName)}
                >
                  <span
                    className={`accordion-icon ${expandedAlbums.has(albumName) ? "accordion-icon-open" : ""}`}
                  >
                    &#9654;
                  </span>
                  <span className="accordion-title">{albumName}</span>
                  <span className="accordion-count">
                    {albumSongs.length} song{albumSongs.length !== 1 ? "s" : ""}
                  </span>
                </button>
                {onToggleAlbum && (
                  <button
                    type="button"
                    onClick={() =>
                      onToggleAlbum(
                        albumName,
                        albumSongs.map((song) => ({
                          id: song._id,
                          title: song.title,
                          duration: song.duration,
                        })),
                      )
                    }
                    className="button button-tertiary button-small"
                  >
                    {allSelected ? "Remove Album" : "Add Album"}
                  </button>
                )}
              </div>

              {expandedAlbums.has(albumName) && (
                <div className="accordion-content">
                  {albumSongs.map(renderSongCheckbox)}
                </div>
              )}
            </div>
          );
        })}

        {looseSongs.map(renderSongCheckbox)}
      </div>
    </section>
  );
}

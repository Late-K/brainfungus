"use client";

import { useState } from "react";
import { CustomSong } from "@/app/types";
import { useFetchData } from "@/app/hooks/useFetchData";
import PickerHeader, {
  PickerShowLess,
  pickerCountLabel,
} from "@/app/components/songs/pickerHeader";

interface CustomSongPickerProps {
  bandId: string;
  title?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  selectedSongs: Array<{
    id: string;
    title: string;
    isCustom?: boolean;
  }>;
  onToggleSong: (
    songId: string,
    title: string,
    duration?: number,
    image?: string,
  ) => void;
  onToggleAlbum?: (
    albumName: string,
    songs: Array<{
      id: string;
      title: string;
      duration?: number;
      image?: string;
    }>,
  ) => void;
}

// the song's own image, or its album's when it has none
const songImage = (song: CustomSong) => song.image || song.albumImage;

export default function CustomSongPicker({
  bandId,
  title = "Your Custom Songs",
  collapsible = false,
  defaultOpen = true,
  selectedSongs,
  onToggleSong,
  onToggleAlbum,
}: CustomSongPickerProps) {
  const { data, isLoading, error } = useFetchData<{ songs: CustomSong[] }>(
    bandId ? `/api/songs?bandId=${bandId}` : null,
  );
  const customSongs = data?.songs ?? [];
  const [isOpen, setIsOpen] = useState(defaultOpen);
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
          onChange={() =>
            onToggleSong(song._id, song.title, song.duration, songImage(song))
          }
        />
        {/* a placeholder keeps titles lined up when a song has no image */}
        {songImage(song) ? (
          <img
            src={songImage(song)}
            alt=""
            className="song-thumbnail song-thumbnail-small"
          />
        ) : (
          <span
            className="song-thumbnail song-thumbnail-small song-thumbnail-placeholder"
            aria-hidden="true"
          >
            &#9835;
          </span>
        )}
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
    <section className="card picker">
      <PickerHeader
        title={title}
        total={customSongs.length}
        collapsible={collapsible}
        isOpen={isOpen}
        onToggle={() => setIsOpen((prev) => !prev)}
      />

      {error && <p className="alert alert-error">{error}</p>}

      {isOpen && (
        <div className="songs-grid picker-list">
          {albums.map(([albumName, albumSongs]) => {
            const allSelected = isAlbumSelected(albumSongs);
            const albumImage = albumSongs.find(
              (song) => song.albumImage,
            )?.albumImage;

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
                    {albumImage && (
                      <img src={albumImage} alt="" className="accordion-thumb" />
                    )}
                    {/* count sits under the name so long names keep their room */}
                    <span className="picker-album-text">
                      <span className="accordion-title">{albumName}</span>
                      <span className="picker-album-count">
                        {pickerCountLabel(albumSongs.length)}
                      </span>
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
                            image: songImage(song),
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

          {albums.length > 0 && looseSongs.length > 0 && (
            <h4 className="picker-group-label">Other songs</h4>
          )}
          {looseSongs.map(renderSongCheckbox)}
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

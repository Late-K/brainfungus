"use client";

// the current user's own learnt and learning songs, to add to a band's
// setlist - personal songs, and custom songs from their other bands

import { useState } from "react";

import { ProfileLearntSong } from "@/app/types";
import SongInfo from "@/app/components/songs/songInfo";
import { useFetchData } from "@/app/hooks/useFetchData";
import { canAddProfileSong } from "@/app/lib/setlistUtils";

interface ProfileSongPickerProps {
  bandId: string;
  title?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  selectedSongs: Array<{ id: string }>;
  onToggleSong: (song: ProfileLearntSong) => void;
}

export default function ProfileSongPicker({
  bandId,
  title = "Your Songs",
  collapsible = false,
  defaultOpen = true,
  selectedSongs,
  onToggleSong,
}: ProfileSongPickerProps) {
  const learnt = useFetchData<{ songs: ProfileLearntSong[] }>(
    "/api/learnt-songs/profile",
  );
  const learning = useFetchData<{ songs: ProfileLearntSong[] }>(
    "/api/learning-songs/profile",
  );
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (learnt.isLoading || learning.isLoading) {
    return <p>Loading your songs...</p>;
  }

  const groups = [
    { label: "Learnt", songs: learnt.data?.songs ?? [] },
    { label: "Learning", songs: learning.data?.songs ?? [] },
  ]
    .map((group) => ({
      ...group,
      songs: group.songs.filter((song) => canAddProfileSong(song, bandId)),
    }))
    .filter((group) => group.songs.length > 0);

  const songCount = groups.reduce((sum, group) => sum + group.songs.length, 0);
  if (songCount === 0) {
    return null;
  }

  const selectedSongIds = new Set(selectedSongs.map((song) => song.id));
  const error = learnt.error || learning.error;

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
            {songCount} song{songCount !== 1 ? "s" : ""}
          </span>
        </button>
      ) : (
        <h3>{title}</h3>
      )}

      {error && <p className="alert alert-error">{error}</p>}

      {isOpen &&
        groups.map((group) => (
          <div key={group.label}>
            <h4 className="margin-top">{group.label}</h4>
            <div className="songs-grid">
              {group.songs.map((song) => (
                <div key={song.id} className="song-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedSongIds.has(song.songId)}
                      onChange={() => onToggleSong(song)}
                    />
                    <SongInfo
                      image={song.image}
                      imageAlt={song.title}
                      title={song.title}
                      meta={
                        song.isCustom
                          ? `Custom song from ${song.bandName ?? "another band"}`
                          : [song.artist, song.album]
                              .filter(Boolean)
                              .join(" - ")
                      }
                      containerClassName="song-details"
                      metaClassName="meta-text meta-text-small margin-top"
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
    </section>
  );
}

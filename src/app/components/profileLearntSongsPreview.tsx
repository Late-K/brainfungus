"use client";

import Link from "next/link";
import { ProfileLearntSong } from "@/app/types";
import { formatDuration } from "@/app/lib/setlistUtils";
import SongInfo from "@/app/components/songInfo";
import { useFetchData } from "@/app/hooks/useFetchData";

const preview_limit = 3;

export default function ProfileLearntSongsPreview() {
  const { data, isLoading, error } = useFetchData<{
    songs: ProfileLearntSong[];
  }>("/api/learnt-songs/profile");
  const songs = data?.songs ?? [];

  if (isLoading) {
    return (
      <section className="card">
        <div className="section-header">
          <h2>My Learnt Songs</h2>
        </div>
        <p className="empty-state">Loading learnt songs...</p>
      </section>
    );
  }

  // Deduplicate by songId before preview
  const dedupedSongs = songs.filter(
    (s, i, arr) => arr.findIndex((x) => x.songId === s.songId) === i,
  );
  const preview = dedupedSongs.slice(-preview_limit).reverse();
  const hasMore = dedupedSongs.length > preview_limit;

  return (
    <section className="card">
      <div className="section-header">
        <h2>My Learnt Songs</h2>
        <Link href="/profile/learnt-songs" className="button button-primary">
          View All
        </Link>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      {songs.length === 0 ? (
        <p className="empty-state">
          No learnt songs yet.{" "}
          <Link href="/profile/learnt-songs">Add some!</Link>
        </p>
      ) : (
        <div className="list">
          {preview.map((song) => (
            <div
              key={song.id}
              className="card-item card-item-stack card-item-regular"
            >
              <div className="song-row">
                <SongInfo
                  image={song.image}
                  imageAlt={song.title}
                  title={song.title}
                  meta={`${[song.artist, song.album].filter(Boolean).join(" — ")}${song.duration ? ` · ${formatDuration(song.duration)}` : ""}`}
                  extra={
                    song.isCustom ? (
                      <>
                        {song.bandName ? (
                          <>
                            Custom song from <strong>{song.bandName}</strong>
                          </>
                        ) : (
                          "Custom song"
                        )}
                        {song.notes ? ` - Note: ${song.notes}` : ""}
                      </>
                    ) : undefined
                  }
                  containerClassName="song-info"
                  titleAs="h3"
                  metaAs="p"
                  extraAs="p"
                  metaClassName="meta-text meta-text-small margin-top"
                  extraClassName="meta-text meta-text-small margin-top"
                />
              </div>
            </div>
          ))}

          {hasMore && (
            <Link href="/profile/learnt-songs" className="preview-link">
              + {dedupedSongs.length - preview_limit} more...
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

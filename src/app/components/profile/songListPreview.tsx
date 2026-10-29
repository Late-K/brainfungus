"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { ProfileLearntSong } from "@/app/types";
import {
  SongPreviewRow,
  CustomSongNote,
} from "@/app/components/songs/songCard";

const preview_limit = 3;

interface SongListPreviewProps {
  heading: string;
  // oldest first, as the server sends them
  songs: ProfileLearntSong[];
  // the full list, left out when there's nothing more to open
  href?: string;
  emptyMessage: ReactNode;
  isLoading?: boolean;
  loadingMessage?: string;
  error?: string;
}

// a card with the newest few songs of a list and a link to the rest
export default function SongListPreview({
  heading,
  songs,
  href,
  emptyMessage,
  isLoading = false,
  loadingMessage,
  error,
}: SongListPreviewProps) {
  if (isLoading) {
    return (
      <section className="card">
        <div className="section-header">
          <h2>{heading}</h2>
        </div>
        <p className="empty-state">{loadingMessage}</p>
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
        <h2>{heading}</h2>
        {href && (
          <Link href={href} className="button button-primary">
            View All
          </Link>
        )}
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      {songs.length === 0 ? (
        <p className="empty-state">{emptyMessage}</p>
      ) : (
        <div className="list">
          {preview.map((song) => (
            <SongPreviewRow
              key={song.id}
              image={song.image}
              title={song.title}
              artist={song.artist}
              album={song.album}
              extra={
                song.isCustom ? (
                  <CustomSongNote bandName={song.bandName} notes={song.notes} />
                ) : undefined
              }
              duration={song.duration}
            />
          ))}

          {hasMore && href && (
            <Link href={href} className="preview-link">
              + {dedupedSongs.length - preview_limit} more...
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

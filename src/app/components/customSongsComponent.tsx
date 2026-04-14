"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CustomSong } from "@/app/types";

const PREVIEW_LIMIT = 3;

export default function CustomSongsComponent({ bandId }: { bandId: string }) {
  const [songs, setSongs] = useState<CustomSong[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSongs();
  }, [bandId]);

  const fetchSongs = async () => {
    try {
      setIsLoading(true);
      setError("");
      const res = await fetch(`/api/songs?bandId=${bandId}`);
      if (!res.ok) throw new Error("Failed to fetch songs");
      const data = await res.json();
      setSongs(data.songs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load songs");
    } finally {
      setIsLoading(false);
    }
  };

  // group by album
  const groupedSongs = songs.reduce<Record<string, CustomSong[]>>(
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

  // build a flat preview list - albums first (shown as one row each), then loose songs
  const previewItems:
    | { type: "album"; name: string; count: number }[]
    | { type: "song"; song: CustomSong }[] = [];
  const allItems: Array<
    | { type: "album"; name: string; count: number }
    | { type: "song"; song: CustomSong }
  > = [];

  for (const [albumName, albumSongs] of albums) {
    allItems.push({ type: "album", name: albumName, count: albumSongs.length });
  }
  for (const song of looseSongs) {
    allItems.push({ type: "song", song });
  }

  const previewSlice = allItems.slice(0, PREVIEW_LIMIT);
  const hasMore = allItems.length > PREVIEW_LIMIT;

  if (isLoading) {
    return (
      <section className="card">
        <p className="empty-state">Loading custom songs...</p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="section-header">
        <h2>Custom Songs</h2>
        <Link href={`/bands/${bandId}/songs`} className="btn btn--primary">
          View All
        </Link>
      </div>

      {error && <p className="alert alert--error">{error}</p>}

      {songs.length === 0 ? (
        <p className="empty-state">
          No custom songs yet.{" "}
          <Link href={`/bands/${bandId}/songs`}>Add some!</Link>
        </p>
      ) : (
        <div className="songs-list">
          {previewSlice.map((item) => {
            if (item.type === "album") {
              return (
                <div key={`album-${item.name}`} className="preview-album-row">
                  <span className="preview-album-name">{item.name}</span>
                  <span className="album-count">
                    {item.count} song{item.count !== 1 ? "s" : ""}
                  </span>
                </div>
              );
            }
            return (
              <div key={item.song._id} className="custom-song-item">
                <div className="song-info">
                  <h3>{item.song.title}</h3>
                  {item.song.notes && (
                    <p className="song-notes">{item.song.notes}</p>
                  )}
                </div>
              </div>
            );
          })}

          {hasMore && (
            <Link href={`/bands/${bandId}/songs`} className="preview-more-link">
              + {allItems.length - PREVIEW_LIMIT} more...
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

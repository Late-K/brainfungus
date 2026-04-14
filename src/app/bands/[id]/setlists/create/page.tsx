// setlist creation page

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSetlistAction } from "@/app/actions/setlists";
import CustomSongsList from "@/app/components/customSongsList";
import { Song, DeezerResult } from "@/app/types";
import { formatDuration } from "@/app/lib/setlistUtils";

export default function CreateSetlistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [bandId, setBandId] = useState<string | null>(null);
  const [setlistName, setSetlistName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DeezerResult[]>([]);
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    const unwrapParams = async () => {
      const { id } = await params;
      setBandId(id);
    };
    unwrapParams();
  }, [params]);

  if (status === "loading") return null;
  if (!session) redirect("/login");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      setSearchError("");
      setSearchResults([]);

      const res = await fetch(
        `/api/deezer/search?q=${encodeURIComponent(searchQuery)}&type=track`,
      );

      if (!res.ok) {
        throw new Error("Failed to search songs");
      }

      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : "Failed to search songs",
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddSong = (result: DeezerResult) => {
    // check if song is already selected
    if (selectedSongs.some((s) => s.id === result.id)) {
      setSelectedSongs(selectedSongs.filter((s) => s.id !== result.id));
    } else {
      const song: Song = {
        id: result.id,
        title: result.title,
        artist: result.artist,
        album: result.album,
        duration: result.duration,
        preview: result.preview,
        image: result.image,
        isCustom: false,
      };
      setSelectedSongs([...selectedSongs, song]);
    }
  };

  const handleToggleCustomSong = (
    songId: string,
    title: string,
    isCustom: boolean,
  ) => {
    setSelectedSongs((prev) => {
      if (prev.some((s) => s.id === songId)) {
        return prev.filter((s) => s.id !== songId);
      }

      const song: Song = {
        id: songId,
        title,
        duration: 0,
        isCustom: true,
      };

      return [...prev, song];
    });
  };

  const handleCreateSetlist = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!setlistName.trim()) {
      setError("Setlist name is required");
      return;
    }

    if (!bandId) {
      setError("Band ID is missing");
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      await createSetlistAction(bandId, setlistName, selectedSongs);

      router.push(`/bands/${bandId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create setlist");
    } finally {
      setIsSaving(false);
    }
  };

  const isSongSelected = (songId: string) =>
    selectedSongs.some((s) => s.id === songId);

  const handleMoveSong = (index: number, direction: "up" | "down") => {
    setSelectedSongs((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= next.length) return prev;

      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const handleRemoveSelectedSong = (songId: string) => {
    setSelectedSongs((prev) => prev.filter((s) => s.id !== songId));
  };

  const handleToggleCustomAlbum = (
    albumName: string,
    songs: Array<{ id: string; title: string }>,
  ) => {
    setSelectedSongs((prev) => {
      const albumSongIds = songs.map((song) => song.id);
      const allSelected = albumSongIds.every((id) =>
        prev.some((song) => song.id === id),
      );

      if (allSelected) {
        return prev.filter((song) => !albumSongIds.includes(song.id));
      }

      const existingIds = new Set(prev.map((song) => song.id));

      const songsToAdd: Song[] = songs
        .filter((song) => !existingIds.has(song.id))
        .map((song) => ({
          id: song.id,
          title: song.title,
          album: albumName,
          duration: 0,
          isCustom: true,
        }));

      return [...prev, ...songsToAdd];
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
        padding: "2rem 1rem",
      }}
    >
      <Link
        href={`/bands/${bandId}`}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <span style={{ cursor: "pointer" }}>← Back to Band</span>
      </Link>

      <div
        style={{
          padding: "1rem",
          border: "1px solid #ccc",
          borderRadius: "8px",
        }}
      >
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          <h1>Create New Setlist</h1>

          <form
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            onSubmit={handleCreateSetlist}
          >
            {error && (
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#ffebee",
                  color: "#d32f2f",
                  borderRadius: "4px",
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <label htmlFor="setlist-name" style={{ fontWeight: "500" }}>
                Setlist Name
              </label>
              <input
                id="setlist-name"
                type="text"
                value={setlistName}
                onChange={(e) => setSetlistName(e.target.value)}
                placeholder="e.g. Summer Tour 2024"
                required
                style={{
                  padding: "0.5rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "1rem",
                }}
              />
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <h3>Selected Songs ({selectedSongs.length})</h3>
              {selectedSongs.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  {selectedSongs.map((song, index) => (
                    <div
                      key={song.id}
                      style={{
                        padding: "1rem",
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "1rem",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: "1rem",
                            alignItems: "center",
                            flex: 1,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.25rem",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleMoveSong(index, "up")}
                              disabled={index === 0}
                              style={{
                                padding: "0.25rem 0.5rem",
                                border: "1px solid #ccc",
                                borderRadius: "4px",
                                backgroundColor: "white",
                                cursor: index === 0 ? "not-allowed" : "pointer",
                              }}
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveSong(index, "down")}
                              disabled={index === selectedSongs.length - 1}
                              style={{
                                padding: "0.25rem 0.5rem",
                                border: "1px solid #ccc",
                                borderRadius: "4px",
                                backgroundColor: "white",
                                cursor:
                                  index === selectedSongs.length - 1
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                            >
                              ▼
                            </button>
                          </div>

                          <span
                            style={{ fontWeight: "600", minWidth: "1.5rem" }}
                          >
                            {index + 1}
                          </span>

                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.25rem",
                              flex: 1,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                              }}
                            >
                              <span style={{ fontWeight: "500" }}>
                                {song.title}
                              </span>
                              {song.isCustom && (
                                <span
                                  style={{
                                    padding: "0.25rem 0.5rem",
                                    backgroundColor: "#2196f3",
                                    color: "white",
                                    borderRadius: "4px",
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  Custom
                                </span>
                              )}
                            </div>

                            {(song.artist || song.album) && (
                              <span style={{ color: "#999" }}>
                                {song.artist}
                                {song.artist && song.album ? " — " : ""}
                                {song.album}
                              </span>
                            )}
                          </div>
                        </div>

                        {song.duration > 0 && (
                          <span style={{ color: "#999" }}>
                            {formatDuration(song.duration)}
                          </span>
                        )}

                        <button
                          type="button"
                          style={{
                            padding: "0.5rem 1rem",
                            backgroundColor: "#d32f2f",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                          onClick={() => handleRemoveSelectedSong(song.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#2196f3",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              type="submit"
              disabled={isSaving || selectedSongs.length === 0}
            >
              {isSaving ? "Creating..." : "Create Setlist"}
            </button>
          </form>
        </div>
      </div>

      <CustomSongsList
        bandId={bandId || ""}
        selectedSongs={selectedSongs}
        onToggleSong={handleToggleCustomSong}
        onToggleAlbum={handleToggleCustomAlbum}
      />

      <div
        style={{
          padding: "1rem",
          border: "1px solid #ccc",
          borderRadius: "8px",
        }}
      >
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          <h2>Search Songs from Deezer</h2>

          <form
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            onSubmit={handleSearch}
          >
            {searchError && (
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#ffebee",
                  color: "#d32f2f",
                  borderRadius: "4px",
                }}
              >
                {searchError}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  flex: 1,
                }}
              >
                <label htmlFor="search-query" style={{ fontWeight: "500" }}>
                  Song Title or Artist
                </label>
                <input
                  id="search-query"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for songs..."
                  style={{
                    padding: "0.5rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontSize: "1rem",
                  }}
                />
              </div>
              <button
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#2196f3",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
                type="submit"
                disabled={isSearching}
              >
                {isSearching ? "Searching..." : "Search"}
              </button>
            </div>
          </form>

          {searchResults.length > 0 && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <span style={{ fontWeight: "500" }}>
                {searchResults.length} Results
              </span>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    style={{
                      padding: "1rem",
                      border: "1px solid #ccc",
                      borderRadius: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "1rem",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      {result.image && (
                        <img
                          src={result.image}
                          alt={result.title}
                          style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "4px",
                          }}
                        />
                      )}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.25rem",
                          flex: 1,
                        }}
                      >
                        <span style={{ fontWeight: "500" }}>
                          {result.title}
                        </span>
                        <span style={{ color: "#999" }}>{result.artist}</span>
                        <span style={{ color: "#999" }}>{result.album}</span>
                      </div>
                      <span style={{ color: "#999" }}>
                        {formatDuration(result.duration)}
                      </span>
                      <button
                        style={{
                          padding: "0.5rem 1rem",
                          backgroundColor: isSongSelected(result.id)
                            ? "#4caf50"
                            : "#2196f3",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                        onClick={() => handleAddSong(result)}
                      >
                        {isSongSelected(result.id) ? "✓ Added" : "Add"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchQuery &&
            !isSearching &&
            searchResults.length === 0 &&
            !searchError && (
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#e3f2fd",
                  color: "#1976d2",
                  borderRadius: "4px",
                }}
              >
                No results found
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

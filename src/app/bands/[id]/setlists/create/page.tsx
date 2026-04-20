// setlist creation page

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSetlistAction } from "@/app/actions/setlists";
import SetlistEditMode from "@/app/components/setlistEditMode";
import { Song, DeezerResult } from "@/app/types";

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

  const handleToggleCustomSong = (songId: string, title: string) => {
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

  const handleCreateSetlist = async () => {
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
    <div className="page-container">
      <Link href={`/bands/${bandId}`} className="back-link">
        ← Back to Band
      </Link>

      {error && (
        <div className="card">
          <p className="alert alert--error">{error}</p>
        </div>
      )}

      <SetlistEditMode
        bandId={bandId || ""}
        editName={setlistName}
        setEditName={setSetlistName}
        editSongs={selectedSongs}
        isSaving={isSaving}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        isSearching={isSearching}
        searchError={searchError}
        onSave={handleCreateSetlist}
        onCancel={() => router.push(`/bands/${bandId}`)}
        onRemoveSong={handleRemoveSelectedSong}
        onMoveSong={handleMoveSong}
        onSearch={handleSearch}
        onAddFromSearch={handleAddSong}
        onToggleCustomSong={handleToggleCustomSong}
        onToggleCustomAlbum={handleToggleCustomAlbum}
        isEditSongSelected={isSongSelected}
        title="Create New Setlist"
        saveLabel="Create Setlist"
        canSave={selectedSongs.length > 0}
      />
    </div>
  );
}

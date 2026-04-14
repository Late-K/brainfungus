// custom songs page

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  createSongAction,
  deleteSongAction,
  updateSongAction,
  reorderAlbumSongsAction,
} from "@/app/actions/songs";
import { Band, CustomSong } from "@/app/types";

export default function SongsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session, status } = useSession();

  const [bandId, setBandId] = useState<string | null>(null);
  const [band, setBand] = useState<Band | null>(null);
  const [songs, setSongs] = useState<CustomSong[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // create form
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newAlbum, setNewAlbum] = useState("");
  const [newAlbumIsCustom, setNewAlbumIsCustom] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editAlbum, setEditAlbum] = useState("");
  const [editAlbumIsCustom, setEditAlbumIsCustom] = useState(false);

  const [expandedAlbums, setExpandedAlbums] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unwrapParams = async () => {
      const { id } = await params;
      setBandId(id);
    };
    unwrapParams();
  }, [params]);

  useEffect(() => {
    if (!bandId) return;
    async function fetchBand() {
      try {
        const res = await fetch(`/api/bands/${bandId}`);
        if (res.ok) {
          const data = await res.json();
          setBand(data.band);
        }
      } catch (err) {
        console.error("Failed to fetch band:", err);
      }
    }
    fetchBand();
  }, [bandId]);

  useEffect(() => {
    if (bandId) fetchSongs();
  }, [bandId]);

  if (status === "loading") return null;
  if (!session) redirect("/login");

  async function fetchSongs() {
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
  }

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !bandId) return;

    try {
      setIsSaving(true);
      setError("");
      const result = await createSongAction(
        bandId,
        newTitle,
        newNotes,
        newAlbum,
      );
      setSongs([result.song, ...songs]);
      setNewTitle("");
      setNewNotes("");
      setNewAlbum("");
      setNewAlbumIsCustom(false);
      setShowForm(false);
      if (result.song.album) {
        setExpandedAlbums((prev) => new Set(prev).add(result.song.album!));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create song");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (songId: string) => {
    if (!confirm("Are you sure you want to delete this song?")) return;
    try {
      await deleteSongAction(songId);
      setSongs(songs.filter((s) => s._id !== songId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete song");
    }
  };

  const startEditing = (song: CustomSong) => {
    setEditingId(song._id);
    setEditTitle(song.title);
    setEditNotes(song.notes || "");
    setEditAlbum(song.album || "");
    setEditAlbumIsCustom(false);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;
    try {
      await updateSongAction(editingId, {
        title: editTitle,
        notes: editNotes,
        album: editAlbum,
      });
      setSongs(
        songs.map((s) =>
          s._id === editingId
            ? { ...s, title: editTitle, notes: editNotes, album: editAlbum }
            : s,
        ),
      );
      setEditingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update song");
    }
  };

  const toggleAlbum = (albumName: string) => {
    setExpandedAlbums((prev) => {
      const next = new Set(prev);
      if (next.has(albumName)) next.delete(albumName);
      else next.add(albumName);
      return next;
    });
  };

  const handleMoveSong = async (
    album: string,
    albumSongs: CustomSong[],
    index: number,
    direction: "up" | "down",
  ) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= albumSongs.length) return;

    const reordered = [...albumSongs];
    [reordered[index], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[index],
    ];

    // Optimistic update
    const reorderedIds = new Set(reordered.map((s) => s._id));
    const otherSongs = songs.filter((s) => !reorderedIds.has(s._id));
    const updatedReordered = reordered.map((s, i) => ({ ...s, order: i }));
    setSongs([...otherSongs, ...updatedReordered]);

    try {
      await reorderAlbumSongsAction(
        bandId!,
        album,
        reordered.map((s) => s._id),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reorder");
      fetchSongs();
    }
  };

  // Group songs
  const groupedSongs = songs.reduce<Record<string, CustomSong[]>>(
    (acc, song) => {
      const key = song.album || "";
      if (!acc[key]) acc[key] = [];
      acc[key].push(song);
      return acc;
    },
    {},
  );

  // Sort songs within each album by order
  for (const key of Object.keys(groupedSongs)) {
    groupedSongs[key].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  const looseSongs = groupedSongs[""] || [];
  const albums = Object.entries(groupedSongs).filter(([key]) => key !== "");

  // Derive existing album names for the picker
  const existingAlbums = albums.map(([name]) => name);

  const renderAlbumPicker = (
    value: string,
    isCustom: boolean,
    onChange: (val: string) => void,
    onCustomToggle: (custom: boolean) => void,
    disabled?: boolean,
  ) => {
    if (isCustom) {
      return (
        <div className="album-picker">
          <input
            type="text"
            className="input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter new album name"
            disabled={disabled}
          />
          <button
            type="button"
            className="btn btn-small btn--tertiary"
            onClick={() => {
              onCustomToggle(false);
              onChange("");
            }}
            disabled={disabled}
          >
            Back
          </button>
        </div>
      );
    }
    return (
      <select
        className="input"
        value={value}
        onChange={(e) => {
          if (e.target.value === "__new__") {
            onCustomToggle(true);
            onChange("");
          } else {
            onChange(e.target.value);
          }
        }}
        disabled={disabled}
      >
        <option value="">No album</option>
        {existingAlbums.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
        <option value="__new__">+ Add new album</option>
      </select>
    );
  };

  const renderSong = (
    song: CustomSong,
    albumName?: string,
    albumSongs?: CustomSong[],
    indexInAlbum?: number,
  ) => {
    if (editingId === song._id) {
      return (
        <div
          key={song._id}
          className="custom-song-item custom-song-item--editing"
        >
          <div className="song-edit-form">
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                className="input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Album</label>
              {renderAlbumPicker(
                editAlbum,
                editAlbumIsCustom,
                setEditAlbum,
                setEditAlbumIsCustom,
              )}
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea
                className="input textarea"
                rows={2}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>
            <div className="song-edit-actions">
              <button
                onClick={handleSaveEdit}
                className="btn btn--primary btn-small"
              >
                Save
              </button>
              <button
                onClick={() => handleDelete(song._id)}
                className="btn btn-small btn-danger"
              >
                Delete
              </button>
              <button
                onClick={cancelEditing}
                className="btn btn--tertiary btn-small"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={song._id} className="custom-song-item">
        {albumName && albumSongs && indexInAlbum !== undefined && (
          <div className="reorder-buttons">
            <button
              onClick={() =>
                handleMoveSong(albumName, albumSongs, indexInAlbum, "up")
              }
              disabled={indexInAlbum === 0}
              className="btn-reorder"
              title="Move up"
            >
              ▲
            </button>
            <button
              onClick={() =>
                handleMoveSong(albumName, albumSongs, indexInAlbum, "down")
              }
              disabled={indexInAlbum === albumSongs.length - 1}
              className="btn-reorder"
              title="Move down"
            >
              ▼
            </button>
          </div>
        )}
        <div className="song-info">
          <h3>{song.title}</h3>
          {song.notes && <p className="song-notes">{song.notes}</p>}
        </div>
        <div className="song-actions">
          <button
            onClick={() => startEditing(song)}
            className="btn btn-small btn--tertiary"
          >
            Edit
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <Link href={`/bands/${bandId}`} className="back-link">
        ← Back to {band?.name || "Band"}
      </Link>

      <section className="card">
        <div className="section-header">
          <h2>Custom Songs</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn--primary"
          >
            {showForm ? "Cancel" : "+ Add Song"}
          </button>
        </div>

        {error && <p className="alert alert--error">{error}</p>}

        {showForm && (
          <form onSubmit={handleAddSong} className="form-section">
            <div className="form-group">
              <label htmlFor="songTitle">Song Title *</label>
              <input
                id="songTitle"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter song title"
                className="input"
                disabled={isSaving}
              />
            </div>
            <div className="form-group">
              <label>Album</label>
              {renderAlbumPicker(
                newAlbum,
                newAlbumIsCustom,
                setNewAlbum,
                setNewAlbumIsCustom,
                isSaving,
              )}
            </div>
            <div className="form-group">
              <label htmlFor="songNotes">Notes</label>
              <textarea
                id="songNotes"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Add relevant notes about the song..."
                className="input textarea"
                rows={3}
                disabled={isSaving}
              />
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn--primary"
            >
              {isSaving ? "Creating..." : "Create Song"}
            </button>
          </form>
        )}

        {isLoading ? (
          <p className="empty-state">Loading songs...</p>
        ) : songs.length === 0 ? (
          <p className="empty-state">
            No custom songs yet. Create one to get started!
          </p>
        ) : (
          <div className="songs-list">
            {albums.map(([albumName, albumSongs]) => (
              <div key={albumName} className="album-group">
                <button
                  className="album-header"
                  onClick={() => toggleAlbum(albumName)}
                >
                  <span
                    className={`album-arrow ${expandedAlbums.has(albumName) ? "album-arrow--open" : ""}`}
                  >
                    &#9654;
                  </span>
                  <span className="album-name">{albumName}</span>
                  <span className="album-count">
                    {albumSongs.length} song
                    {albumSongs.length !== 1 ? "s" : ""}
                  </span>
                </button>
                {expandedAlbums.has(albumName) && (
                  <div className="album-songs">
                    {albumSongs.map((song, idx) =>
                      renderSong(song, albumName, albumSongs, idx),
                    )}
                  </div>
                )}
              </div>
            ))}

            {looseSongs.map((song) => renderSong(song))}
          </div>
        )}
      </section>
    </div>
  );
}

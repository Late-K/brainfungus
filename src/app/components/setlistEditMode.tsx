"use client";

import { Song, DeezerResult } from "@/app/types";
import { formatDuration } from "@/app/lib/setlistUtils";
import CustomSongsList from "@/app/components/customSongsList";

interface SetlistEditModeProps {
  bandId: string;
  editName: string;
  setEditName: (name: string) => void;
  editSongs: Song[];
  isSaving: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: DeezerResult[];
  isSearching: boolean;
  searchError: string;
  onSave: () => void;
  onCancel: () => void;
  onRemoveSong: (songId: string) => void;
  onMoveSong: (index: number, direction: "up" | "down") => void;
  onSearch: (e: React.FormEvent) => void;
  onAddFromSearch: (result: DeezerResult) => void;
  onToggleCustomSong: (songId: string, title: string) => void;
  onToggleCustomAlbum?: (
    albumName: string,
    songs: Array<{ id: string; title: string }>,
  ) => void;
  isEditSongSelected: (songId: string) => boolean;
  title?: string;
  saveLabel?: string;
  canSave?: boolean;
}

export default function SetlistEditMode({
  bandId,
  editName,
  setEditName,
  editSongs,
  isSaving,
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  searchError,
  onSave,
  onCancel,
  onRemoveSong,
  onMoveSong,
  onSearch,
  onAddFromSearch,
  onToggleCustomSong,
  onToggleCustomAlbum,
  isEditSongSelected,
  title = "Edit Setlist",
  saveLabel = "Save",
  canSave = true,
}: SetlistEditModeProps) {
  return (
    <>
      <div className="card setlist-detail-card">
        <div className="setlist-detail-header">
          <h2 className="setlist-title" style={{ margin: 0 }}>
            {title}
          </h2>
          <div className="setlist-detail-actions">
            <button
              onClick={onSave}
              disabled={isSaving || !editName.trim() || !canSave}
              className="btn btn--primary btn-small"
            >
              {isSaving ? "Saving..." : saveLabel}
            </button>
            <button
              onClick={onCancel}
              disabled={isSaving}
              className="btn btn--tertiary btn-small"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="edit-name" className="label">
            Setlist Name
          </label>
          <input
            id="edit-name"
            type="text"
            className="input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Setlist name"
          />
        </div>
      </div>

      <div className="card">
        <h2 className="setlist-title">Current Songs ({editSongs.length})</h2>
        {editSongs.length > 0 ? (
          <div className="setlist-song-list">
            {editSongs.map((song, index) => (
              <div key={song.id} className="setlist-song-item">
                <div className="setlist-song-main">
                  <div className="reorder-buttons">
                    <button
                      onClick={() => onMoveSong(index, "up")}
                      disabled={index === 0}
                      className="btn-reorder"
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => onMoveSong(index, "down")}
                      disabled={index === editSongs.length - 1}
                      className="btn-reorder"
                      title="Move down"
                    >
                      ▼
                    </button>
                  </div>
                  <span className="setlist-song-number">{index + 1}</span>
                  <div className="setlist-song-info">
                    <span className="song-title">
                      {song.title}
                      {song.isCustom && (
                        <span
                          className="badge"
                          style={{ marginLeft: "0.5rem" }}
                        >
                          Custom
                        </span>
                      )}
                    </span>
                    {song.artist && (
                      <span className="song-artist">
                        {song.artist}
                        {song.album ? ` — ${song.album}` : ""}
                      </span>
                    )}
                  </div>
                  {song.duration > 0 && (
                    <span className="setlist-song-duration">
                      {formatDuration(song.duration)}
                    </span>
                  )}
                  <button
                    onClick={() => onRemoveSong(song.id)}
                    className="btn btn-small btn--tertiary btn--tertiary-danger"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No songs — add some below</p>
        )}
      </div>

      <CustomSongsList
        bandId={bandId || ""}
        selectedSongs={editSongs}
        onToggleSong={onToggleCustomSong}
        onToggleAlbum={onToggleCustomAlbum}
      />

      <div className="card">
        <h2 className="setlist-title">Search Songs from Deezer</h2>
        <form onSubmit={onSearch} className="edit-search-form">
          <input
            type="text"
            className="input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for songs..."
          />
          <button
            type="submit"
            disabled={isSearching}
            className="btn btn--primary btn-small"
          >
            {isSearching ? "..." : "Search"}
          </button>
        </form>

        {searchError && <p className="alert alert--error">{searchError}</p>}

        {searchResults.length > 0 && (
          <div className="setlist-song-list" style={{ marginTop: "1rem" }}>
            {searchResults.map((result) => (
              <div key={result.id} className="setlist-song-item">
                <div className="setlist-song-main">
                  <div className="setlist-song-info">
                    <span className="song-title">{result.title}</span>
                    <span className="song-artist">
                      {result.artist} — {result.album}
                    </span>
                  </div>
                  <span className="setlist-song-duration">
                    {formatDuration(result.duration)}
                  </span>
                  <button
                    onClick={() => onAddFromSearch(result)}
                    className={`btn btn-small ${
                      isEditSongSelected(result.id)
                        ? "btn--learnt"
                        : "btn--primary"
                    }`}
                  >
                    {isEditSongSelected(result.id) ? "✓ Added" : "Add"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {searchQuery &&
          !isSearching &&
          searchResults.length === 0 &&
          !searchError && <p className="empty-state">No results found</p>}
      </div>
    </>
  );
}

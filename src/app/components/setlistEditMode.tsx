"use client";

import { Song, DeezerResult, BandCover } from "@/app/types";
import { formatDuration } from "@/app/lib/setlistUtils";
import CustomSongsList from "@/app/components/customSongsList";
import BandCoversList from "@/app/components/bandCoversList";
import DeezerSearch from "@/app/components/deezerSearch";

interface SetlistEditModeProps {
  bandId: string;
  collapseSongPickers?: boolean;
  editName: string;
  setEditName: (name: string) => void;
  editSongs: Song[];
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
  onRemoveSong: (songId: string) => void;
  onMoveSong: (index: number, direction: "up" | "down") => void;
  onAddFromSearch: (result: DeezerResult) => void;
  onToggleCustomSong: (
    songId: string,
    title: string,
    duration?: number,
    image?: string,
  ) => void;
  onToggleCustomAlbum?: (
    albumName: string,
    songs: Array<{
      id: string;
      title: string;
      duration?: number;
      image?: string;
    }>,
  ) => void;
  onToggleCoverSong: (cover: BandCover) => void;
  isEditSongSelected: (songId: string) => boolean;
  title?: string;
  saveLabel?: string;
  canSave?: boolean;
}

export default function SetlistEditMode({
  bandId,
  collapseSongPickers = false,
  editName,
  setEditName,
  editSongs,
  isSaving,
  onSave,
  onCancel,
  onRemoveSong,
  onMoveSong,
  onAddFromSearch,
  onToggleCustomSong,
  onToggleCustomAlbum,
  onToggleCoverSong,
  isEditSongSelected,
  title = "Edit Setlist",
  saveLabel = "Save",
  canSave = true,
}: SetlistEditModeProps) {
  return (
    <div className="editor-layout">
      <div className="editor-layout-main">
        <div className="card margin-bottom">
          <div className="stack margin-bottom">
            <h2 className="heading no-margin">{title}</h2>
            <div className="inline-actions">
              <button
                onClick={onSave}
                disabled={isSaving || !editName.trim() || !canSave}
                className="button button-primary button-small"
              >
                {isSaving ? "Saving..." : saveLabel}
              </button>
              <button
                onClick={onCancel}
                disabled={isSaving}
                className="button button-tertiary button-small"
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
          <h2 className="heading">Current Songs ({editSongs.length})</h2>
          {editSongs.length > 0 ? (
            <div className="list">
              {editSongs.map((song, index) => (
                <div key={song.id} className="card-item card-item-compact">
                  <div className="song-row">
                    <div className="reorder-buttons">
                      <button
                        onClick={() => onMoveSong(index, "up")}
                        disabled={index === 0}
                        className="button-reorder"
                        title="Move up"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => onMoveSong(index, "down")}
                        disabled={index === editSongs.length - 1}
                        className="button-reorder"
                        title="Move down"
                      >
                        ▼
                      </button>
                    </div>
                    <span className="song-index">{index + 1}</span>
                    {song.image && (
                      <img
                        src={song.image}
                        alt=""
                        className="song-thumbnail song-thumbnail-small"
                      />
                    )}
                    <div className="song-body">
                      <span className="item-title">{song.title}</span>
                      {song.artist && (
                        <span className="meta-text meta-text-small block">
                          {song.artist}
                          {song.album ? ` — ${song.album}` : ""}
                        </span>
                      )}
                    </div>
                    {song.duration > 0 && (
                      <span className="song-duration">
                        {formatDuration(song.duration)}
                      </span>
                    )}
                    {/* icon button so the title keeps room next to the image */}
                    <button
                      onClick={() => onRemoveSong(song.id)}
                      className="button button-small button-tertiary button-tertiary-danger button-icon"
                      title="Remove"
                      aria-label={`Remove ${song.title}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No songs — add some below</p>
          )}
        </div>
      </div>

      <div className="editor-layout-side">
        <CustomSongsList
          bandId={bandId || ""}
          collapsible={collapseSongPickers}
          defaultOpen={!collapseSongPickers}
          selectedSongs={editSongs}
          onToggleSong={onToggleCustomSong}
          onToggleAlbum={onToggleCustomAlbum}
        />

        <BandCoversList
          bandId={bandId || ""}
          collapsible={collapseSongPickers}
          defaultOpen={!collapseSongPickers}
          selectedSongs={editSongs}
          onToggleCover={onToggleCoverSong}
        />

        <DeezerSearch
          onAddFromSearch={onAddFromSearch}
          isSongSelected={isEditSongSelected}
        />
      </div>
    </div>
  );
}

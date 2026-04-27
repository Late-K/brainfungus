"use client";

import { DeezerResult } from "@/app/types";
import { formatDuration } from "@/app/lib/setlistUtils";
import SongInfo from "@/app/components/songInfo";
import SongAudioPlayer from "@/app/components/songAudioPlayer";

interface DeezerSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: DeezerResult[];
  isSearching: boolean;
  searchError: string;
  onSearch: (e: React.FormEvent) => void;
  onAddFromSearch: (result: DeezerResult) => void;
  isSongSelected: (songId: string) => boolean;
}

export default function DeezerSearch({
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  searchError,
  onSearch,
  onAddFromSearch,
  isSongSelected,
}: DeezerSearchProps) {
  return (
    <div className="card">
      <h2 className="heading">Search Songs from Deezer</h2>
      <form onSubmit={onSearch} className="search-row">
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
          className="button button-primary button-small"
        >
          {isSearching ? "..." : "Search"}
        </button>
      </form>

      {searchError && <p className="alert alert-error">{searchError}</p>}

      {searchResults.length > 0 && (
        <div className="list list-top">
          {searchResults.map((result) => (
            <div key={result.id} className="card-item card-item-compact">
              <div className="song-row">
                <SongInfo
                  image={result.image}
                  imageAlt={result.title}
                  title={result.title}
                  meta={`${result.artist} - ${result.album}`}
                />
                <span className="song-duration">
                  {formatDuration(result.duration)}
                </span>
                <button
                  onClick={() => onAddFromSearch(result)}
                  className={`button button-small ${
                    isSongSelected(result.id)
                      ? "button-learnt"
                      : "button-primary"
                  }`}
                >
                  {isSongSelected(result.id) ? "✓ Added" : "Add"}
                </button>
              </div>
              <SongAudioPlayer
                src={result.preview}
                deezerTrackId={result.id}
                unavailableLabel="Preview unavailable"
              />
            </div>
          ))}
        </div>
      )}

      {searchQuery &&
        !isSearching &&
        searchResults.length === 0 &&
        !searchError && <p className="empty-state">No results found</p>}
    </div>
  );
}

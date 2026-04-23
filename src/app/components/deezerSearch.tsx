"use client";

import { DeezerResult } from "@/app/types";
import { formatDuration } from "@/app/lib/setlistUtils";

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
          className="btn btn--primary btn-small"
        >
          {isSearching ? "..." : "Search"}
        </button>
      </form>

      {searchError && <p className="alert alert--error">{searchError}</p>}

      {searchResults.length > 0 && (
        <div className="list" style={{ marginTop: "1rem" }}>
          {searchResults.map((result) => (
            <div key={result.id} className="card-item card-item-compact">
              <div className="song-row">
                <div className="song-body">
                  <span className="item-title">{result.title}</span>
                  <span className="meta-text meta-text-small block">
                    {result.artist} - {result.album}
                  </span>
                </div>
                <span className="song-duration">
                  {formatDuration(result.duration)}
                </span>
                <button
                  onClick={() => onAddFromSearch(result)}
                  className={`btn btn-small ${
                    isSongSelected(result.id) ? "btn--learnt" : "btn--primary"
                  }`}
                >
                  {isSongSelected(result.id) ? "✓ Added" : "Add"}
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
  );
}

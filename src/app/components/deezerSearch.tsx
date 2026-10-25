"use client";

import {
  DeezerAlbum,
  DeezerArtist,
  DeezerResult,
  DeezerSearchType,
} from "@/app/types";
import { formatDuration } from "@/app/lib/setlistUtils";
import SongInfo from "@/app/components/songInfo";
import SongAudioPlayer from "@/app/components/songAudioPlayer";
import OpenInMusicAppLink from "@/app/components/openInMusicAppLink";
import { useDeezerSearch } from "@/app/hooks/useDeezerSearch";
import { useDeezerBrowse } from "@/app/hooks/useDeezerBrowse";

interface DeezerSearchProps {
  onAddFromSearch: (result: DeezerResult) => void;
  isSongSelected: (songId: string) => boolean;
}

const SEARCH_TABS: Array<{
  type: DeezerSearchType;
  label: string;
  placeholder: string;
}> = [
  { type: "track", label: "Songs", placeholder: "Search for songs..." },
  { type: "artist", label: "Artists", placeholder: "Search for artists..." },
  { type: "album", label: "Albums", placeholder: "Search for albums..." },
];

const RECORD_TYPE_LABELS: Record<string, string> = {
  album: "Album",
  ep: "EP",
  single: "Single",
  compile: "Compilation",
};

const compactNumber = new Intl.NumberFormat("en", { notation: "compact" });

function albumMeta(album: DeezerAlbum, includeArtist: boolean) {
  return [
    includeArtist ? album.artist : null,
    RECORD_TYPE_LABELS[album.recordType] || "Album",
    album.releaseDate?.slice(0, 4),
  ]
    .filter(Boolean)
    .join(" · ");
}

function artistMeta(artist: DeezerArtist) {
  return [
    artist.albumCount > 0
      ? `${artist.albumCount} album${artist.albumCount === 1 ? "" : "s"}`
      : null,
    artist.fanCount > 0 ? `${compactNumber.format(artist.fanCount)} fans` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

interface TrackRowProps {
  track: DeezerResult;
  meta: string;
  isSelected: boolean;
  onAdd: (track: DeezerResult) => void;
}

function TrackRow({ track, meta, isSelected, onAdd }: TrackRowProps) {
  return (
    <div className="card-item card-item-compact">
      <div className="song-row">
        <SongInfo
          image={track.image}
          imageAlt={track.title}
          title={track.title}
          meta={meta}
        />
        <span className="song-duration">{formatDuration(track.duration)}</span>
        <button
          onClick={() => onAdd(track)}
          className={`button button-small ${
            isSelected ? "button-learnt" : "button-primary"
          }`}
        >
          {isSelected ? "✓ Added" : "Add"}
        </button>
      </div>
      <SongAudioPlayer
        src={track.preview}
        deezerTrackId={track.id}
        unavailableLabel="Preview unavailable"
      />
      <OpenInMusicAppLink
        deezerTrackId={track.id}
        title={track.title}
        artist={track.artist}
      />
    </div>
  );
}

interface BrowseRowProps {
  image?: string;
  title: string;
  meta: string;
  round?: boolean;
  onClick: () => void;
}

function BrowseRow({ image, title, meta, round, onClick }: BrowseRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card-item card-item-compact deezer-browse-row"
    >
      <div className="song-row">
        {image && (
          <img
            src={image}
            alt={title}
            className={`song-thumbnail${round ? " song-thumbnail-round" : ""}`}
          />
        )}
        <div className="song-body">
          <span className="item-title">{title}</span>
          {meta && (
            <span className="meta-text meta-text-small block">{meta}</span>
          )}
        </div>
        <span className="deezer-browse-chevron" aria-hidden>
          ›
        </span>
      </div>
    </button>
  );
}

export default function DeezerSearch({
  onAddFromSearch,
  isSongSelected,
}: DeezerSearchProps) {
  const {
    searchQuery,
    setSearchQuery,
    searchType,
    setSearchType,
    searchResults,
    artistResults,
    albumResults,
    isSearching,
    searchError,
    handleSearch,
  } = useDeezerSearch();
  const browse = useDeezerBrowse();

  const activeTab =
    SEARCH_TABS.find((tab) => tab.type === searchType) || SEARCH_TABS[0];
  const resultCount =
    searchType === "artist"
      ? artistResults.length
      : searchType === "album"
        ? albumResults.length
        : searchResults.length;

  const renderTrack = (track: DeezerResult, meta: string) => (
    <TrackRow
      key={track.id}
      track={track}
      meta={meta}
      isSelected={isSongSelected(track.id)}
      onAdd={onAddFromSearch}
    />
  );

  const renderBrowse = () => {
    const { currentView, artistDetail, albumDetail } = browse;
    if (!currentView) return null;

    return (
      <div className="list-top">
        <button
          type="button"
          onClick={browse.goBack}
          className="button button-tertiary button-small"
        >
          ← Back to {browse.previousLabel || "results"}
        </button>

        {browse.browseError && (
          <p className="alert alert-error">{browse.browseError}</p>
        )}
        {browse.isLoading && (
          <p className="empty-state">Loading {currentView.label}...</p>
        )}

        {artistDetail && (
          <>
            <div className="song-row deezer-browse-header">
              <SongInfo
                image={artistDetail.artist.image}
                imageAlt={artistDetail.artist.name}
                title={artistDetail.artist.name}
                titleAs="h3"
                titleClassName="heading no-margin"
                meta={artistMeta(artistDetail.artist)}
              />
            </div>

            {artistDetail.topTracks.length > 0 && (
              <div className="section-block">
                <h3 className="section-subtitle">Top songs</h3>
                <div className="list">
                  {artistDetail.topTracks.map((track) =>
                    renderTrack(track, track.album),
                  )}
                </div>
              </div>
            )}

            {artistDetail.albums.length > 0 && (
              <div className="section-block list-top">
                <h3 className="section-subtitle">Discography</h3>
                <div className="list">
                  {artistDetail.albums.map((album) => (
                    <BrowseRow
                      key={album.id}
                      image={album.image}
                      title={album.title}
                      meta={albumMeta(album, false)}
                      onClick={() => browse.openAlbum(album.id, album.title)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {albumDetail && (
          <>
            <div className="song-row deezer-browse-header">
              <SongInfo
                image={albumDetail.album.image}
                imageAlt={albumDetail.album.title}
                title={albumDetail.album.title}
                titleAs="h3"
                titleClassName="heading no-margin"
                meta={albumMeta(albumDetail.album, true)}
              />
            </div>
            <div className="list">
              {albumDetail.tracks.map((track) =>
                renderTrack(track, track.artist),
              )}
            </div>
            {albumDetail.tracks.length === 0 && (
              <p className="empty-state">No tracks found</p>
            )}
          </>
        )}
      </div>
    );
  };

  const renderResults = () => {
    if (searchType === "artist") {
      return artistResults.map((artist) => (
        <BrowseRow
          key={artist.id}
          image={artist.image}
          title={artist.name}
          meta={artistMeta(artist)}
          round
          onClick={() => browse.openArtist(artist.id, artist.name)}
        />
      ));
    }

    if (searchType === "album") {
      return albumResults.map((album) => (
        <BrowseRow
          key={album.id}
          image={album.image}
          title={album.title}
          meta={albumMeta(album, true)}
          onClick={() => browse.openAlbum(album.id, album.title)}
        />
      ));
    }

    return searchResults.map((track) =>
      renderTrack(track, `${track.artist} - ${track.album}`),
    );
  };

  return (
    <div className="card">
      <h2 className="heading">Search Songs from Deezer</h2>
      <form onSubmit={handleSearch} className="search-row">
        <input
          type="text"
          className="input"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            browse.closeBrowse();
          }}
          placeholder={activeTab.placeholder}
        />
        <button
          type="submit"
          disabled={isSearching}
          className="button button-primary button-small"
        >
          {isSearching ? "..." : "Search"}
        </button>
      </form>

      <div className="tab-group deezer-search-tabs">
        {SEARCH_TABS.map((tab) => (
          <button
            key={tab.type}
            type="button"
            onClick={() => {
              setSearchType(tab.type);
              browse.closeBrowse();
            }}
            className={`tab${tab.type === searchType ? " tab-active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {searchError && <p className="alert alert-error">{searchError}</p>}

      {browse.currentView ? (
        renderBrowse()
      ) : (
        <>
          {resultCount > 0 && <div className="list">{renderResults()}</div>}

          {searchQuery.trim() &&
            !isSearching &&
            resultCount === 0 &&
            !searchError && <p className="empty-state">No results found</p>}
        </>
      )}
    </div>
  );
}

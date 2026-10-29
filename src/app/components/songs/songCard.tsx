"use client";

import { ReactNode } from "react";
import { formatDuration } from "@/app/lib/setlistUtils";
import SongInfo from "@/app/components/songs/songInfo";
import SongAudioPlayer from "@/app/components/songs/songAudioPlayer";
import OpenInMusicAppLink from "@/app/components/songs/openInMusicAppLink";

interface SongDetails {
  image?: string;
  title: string;
  artist?: string;
  album?: string;
  // shown under the artist, e.g. a custom song's band and notes
  extra?: ReactNode;
  duration?: number;
}

interface SongCardProps extends SongDetails {
  audioSrc?: string | null;
  // only for Deezer songs - custom songs have no track to open or stream
  deezerTrackId?: string;
  unavailableLabel?: string;
  // before the song info, e.g. reorder buttons and position
  leading?: ReactNode;
  // own row above the audio so the title keeps its width in narrow columns
  actions?: ReactNode;
  // below the audio, e.g. learnt status
  children?: ReactNode;
}

function songMeta(artist?: string, album?: string) {
  return [artist, album].filter(Boolean).join(" — ");
}

// a song in a full list: info, actions, audio preview, then anything list-specific
export default function SongCard({
  image,
  title,
  artist,
  album,
  extra,
  duration,
  audioSrc,
  deezerTrackId,
  unavailableLabel,
  leading,
  actions,
  children,
}: SongCardProps) {
  return (
    <div className="card-item card-item-compact">
      <div className="song-row">
        {leading}
        <SongInfo
          image={image}
          imageAlt={title}
          title={title}
          meta={songMeta(artist, album)}
          extra={extra}
        />
        {duration ? (
          <span className="song-duration">{formatDuration(duration)}</span>
        ) : null}
      </div>

      {actions && <div className="inline-actions song-actions">{actions}</div>}

      <SongAudioPlayer
        src={audioSrc}
        deezerTrackId={deezerTrackId}
        unavailableLabel={unavailableLabel}
      />
      <OpenInMusicAppLink
        deezerTrackId={deezerTrackId}
        title={title}
        artist={artist}
      />

      {children}
    </div>
  );
}

// a song in a preview: info and duration only
export function SongPreviewRow({
  image,
  title,
  artist,
  album,
  extra,
  duration,
}: SongDetails) {
  return (
    <div className="card-item card-item-stack card-item-regular">
      <div className="song-row">
        <SongInfo
          image={image}
          imageAlt={title}
          title={title}
          meta={songMeta(artist, album)}
          extra={extra}
          containerClassName="song-info"
          titleAs="h3"
          metaAs="p"
          extraAs="p"
          metaClassName="meta-text meta-text-small margin-top"
          extraClassName="meta-text meta-text-small margin-top"
        />
        {duration ? (
          <span className="song-duration">{formatDuration(duration)}</span>
        ) : null}
      </div>
    </div>
  );
}

// where a custom song on someone's profile comes from, plus their notes on it
export function CustomSongNote({
  bandName,
  notes,
}: {
  bandName?: string;
  notes?: string;
}) {
  return (
    <>
      {bandName ? (
        <>
          Custom song from <strong>{bandName}</strong>
        </>
      ) : (
        "Custom song"
      )}
      {notes ? ` - Note: ${notes}` : ""}
    </>
  );
}

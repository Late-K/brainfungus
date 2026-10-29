"use client";

// the current user's bands with their covers and setlists, shared by every
// + Songlist button on the page so a long song list only loads them once,
// and adding a song from one row shows on every other row with the same song

import { useEffect, useSyncExternalStore } from "react";
import { UserSonglistBand } from "@/app/types";

// loaded lists older than this are refetched when a list mounts or a menu
// opens, e.g. after making a new setlist on another page
const STALE_MS = 30_000;

type MySonglistsState = {
  bands: UserSonglistBand[] | null;
  isLoading: boolean;
  error: string;
};

let state: MySonglistsState = { bands: null, isLoading: false, error: "" };
let loadedAt = 0;
let request: Promise<void> | null = null;
const listeners = new Set<() => void>();
const serverState: MySonglistsState = {
  bands: null,
  isLoading: false,
  error: "",
};

function setState(next: Partial<MySonglistsState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function refreshMySonglists() {
  request ??= (async () => {
    setState({ isLoading: true, error: "" });
    try {
      const res = await fetch("/api/songlists");
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data: { bands: UserSonglistBand[] } = await res.json();
      loadedAt = Date.now();
      setState({ bands: data.bands, isLoading: false });
    } catch (err) {
      setState({
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to load song lists",
      });
    } finally {
      request = null;
    }
  })();
  return request;
}

export function refreshMySonglistsIfStale() {
  if (Date.now() - loadedAt > STALE_MS) refreshMySonglists();
}

const toggleId = (ids: string[], id: string, include: boolean) =>
  include ? [...new Set([...ids, id])] : ids.filter((other) => other !== id);

// update a list straight away after adding or removing a song - a setlist,
// or the band's covers when setlistId is left out
export function setSongInMySonglist(
  bandId: string,
  setlistId: string | undefined,
  songId: string,
  include: boolean,
) {
  if (!state.bands) return;
  setState({
    bands: state.bands.map((band) =>
      band._id !== bandId
        ? band
        : setlistId
          ? {
              ...band,
              setlists: band.setlists.map((setlist) =>
                setlist._id === setlistId
                  ? {
                      ...setlist,
                      songIds: toggleId(setlist.songIds, songId, include),
                    }
                  : setlist,
              ),
            }
          : {
              ...band,
              coverSongIds: toggleId(band.coverSongIds, songId, include),
            },
    ),
  });
}

export function useMySonglists() {
  const current = useSyncExternalStore(
    subscribe,
    () => state,
    () => serverState,
  );

  useEffect(() => {
    refreshMySonglistsIfStale();
  }, []);

  return current;
}

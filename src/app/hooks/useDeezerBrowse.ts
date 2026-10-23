// drill-down from search results into an artist or album, kept in place
// (not separate pages) so unsaved setlist edits aren't lost

"use client";

import { useEffect, useState } from "react";
import { DeezerAlbumDetail, DeezerArtistDetail } from "@/app/types";

export type DeezerBrowseView =
  | { kind: "artist"; id: string; label: string }
  | { kind: "album"; id: string; label: string };

type BrowseDetail = DeezerArtistDetail | DeezerAlbumDetail;

const viewKey = (view: DeezerBrowseView) => `${view.kind}:${view.id}`;

export function useDeezerBrowse() {
  const [stack, setStack] = useState<DeezerBrowseView[]>([]);
  const [cache, setCache] = useState<Record<string, BrowseDetail>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [browseError, setBrowseError] = useState("");

  const currentView = stack.length > 0 ? stack[stack.length - 1] : null;
  const currentKey = currentView ? viewKey(currentView) : null;

  useEffect(() => {
    if (!currentView || !currentKey || cache[currentKey]) return;

    const controller = new AbortController();

    const load = async () => {
      try {
        setIsLoading(true);
        setBrowseError("");

        const res = await fetch(
          `/api/deezer/${currentView.kind}?id=${encodeURIComponent(currentView.id)}`,
          { signal: controller.signal },
        );

        if (!res.ok) {
          throw new Error(`Failed to load ${currentView.kind}`);
        }

        const data: BrowseDetail = await res.json();
        setCache((prev) => ({ ...prev, [currentKey]: data }));
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setBrowseError(
          err instanceof Error ? err.message : "Failed to load from Deezer",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [currentKey]);

  const openArtist = (id: string, label: string) =>
    setStack((prev) => [...prev, { kind: "artist", id, label }]);

  const openAlbum = (id: string, label: string) =>
    setStack((prev) => [...prev, { kind: "album", id, label }]);

  const goBack = () => {
    setBrowseError("");
    setStack((prev) => prev.slice(0, -1));
  };

  const closeBrowse = () => {
    setBrowseError("");
    setStack([]);
  };

  const detail = currentKey ? cache[currentKey] : undefined;

  return {
    currentView,
    canGoBack: stack.length > 0,
    previousLabel: stack.length > 1 ? stack[stack.length - 2].label : null,
    artistDetail:
      currentView?.kind === "artist"
        ? (detail as DeezerArtistDetail | undefined)
        : undefined,
    albumDetail:
      currentView?.kind === "album"
        ? (detail as DeezerAlbumDetail | undefined)
        : undefined,
    isLoading: isLoading && !detail,
    browseError,
    openArtist,
    openAlbum,
    goBack,
    closeBrowse,
  };
}

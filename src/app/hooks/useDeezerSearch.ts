"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  DeezerAlbum,
  DeezerArtist,
  DeezerResult,
  DeezerSearchType,
} from "@/app/types";

interface UseDeezerSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  autoSearch?: boolean;
}

export function useDeezerSearch(options?: UseDeezerSearchOptions) {
  const debounceMs = options?.debounceMs ?? 350;
  const minQueryLength = options?.minQueryLength ?? 2;
  const autoSearch = options?.autoSearch ?? true;
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<DeezerSearchType>("track");
  const [searchResults, setSearchResults] = useState<DeezerResult[]>([]);
  const [artistResults, setArtistResults] = useState<DeezerArtist[]>([]);
  const [albumResults, setAlbumResults] = useState<DeezerAlbum[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const activeControllerRef = useRef<AbortController | null>(null);

  const clearResults = () => {
    setSearchResults([]);
    setArtistResults([]);
    setAlbumResults([]);
  };

  const runSearch = async (query: string, type: DeezerSearchType) => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < minQueryLength) {
      clearResults();
      setSearchError("");
      setIsSearching(false);
      return;
    }

    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;

    try {
      setIsSearching(true);
      setSearchError("");

      const res = await fetch(
        `/api/deezer/search?q=${encodeURIComponent(trimmedQuery)}&type=${type}`,
        { signal: controller.signal },
      );

      if (!res.ok) {
        throw new Error("Failed to search Deezer");
      }

      const data = await res.json();
      const results = data.results || [];
      setSearchResults(type === "track" ? results : []);
      setArtistResults(type === "artist" ? results : []);
      setAlbumResults(type === "album" ? results : []);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setSearchError(
        err instanceof Error ? err.message : "Failed to search Deezer",
      );
    } finally {
      if (activeControllerRef.current === controller) {
        setIsSearching(false);
      }
    }
  };

  const resetSearch = () => {
    activeControllerRef.current?.abort();
    setSearchQuery("");
    clearResults();
    setSearchError("");
    setIsSearching(false);
  };

  const changeSearchType = (type: DeezerSearchType) => {
    if (type === searchType) return;
    setSearchType(type);
    // avoid flashing "no results" before the debounced search for the new tab fires
    if (searchQuery.trim().length >= minQueryLength) {
      setIsSearching(true);
    }
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    await runSearch(searchQuery, searchType);
  };

  useEffect(() => {
    if (!autoSearch) return;

    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length === 0) {
      activeControllerRef.current?.abort();
      clearResults();
      setSearchError("");
      setIsSearching(false);
      return;
    }

    const timeout = setTimeout(() => {
      void runSearch(searchQuery, searchType);
    }, debounceMs);

    return () => clearTimeout(timeout);
  }, [searchQuery, searchType, autoSearch, debounceMs]);

  useEffect(() => {
    return () => {
      activeControllerRef.current?.abort();
    };
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchType,
    setSearchType: changeSearchType,
    searchResults,
    artistResults,
    albumResults,
    isSearching,
    searchError,
    handleSearch,
    resetSearch,
  };
}

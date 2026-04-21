"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { DeezerResult } from "@/app/types";

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
  const [searchResults, setSearchResults] = useState<DeezerResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const activeControllerRef = useRef<AbortController | null>(null);

  const runSearch = async (query: string) => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < minQueryLength) {
      setSearchResults([]);
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
        `/api/deezer/search?q=${encodeURIComponent(trimmedQuery)}&type=track`,
        { signal: controller.signal },
      );

      if (!res.ok) {
        throw new Error("Failed to search songs");
      }

      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setSearchError(
        err instanceof Error ? err.message : "Failed to search songs",
      );
    } finally {
      setIsSearching(false);
    }
  };

  const resetSearch = () => {
    activeControllerRef.current?.abort();
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
    setIsSearching(false);
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    await runSearch(searchQuery);
  };

  useEffect(() => {
    if (!autoSearch) return;

    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length === 0) {
      activeControllerRef.current?.abort();
      setSearchResults([]);
      setSearchError("");
      setIsSearching(false);
      return;
    }

    const timeout = setTimeout(() => {
      void runSearch(searchQuery);
    }, debounceMs);

    return () => clearTimeout(timeout);
  }, [searchQuery, autoSearch, debounceMs]);

  useEffect(() => {
    return () => {
      activeControllerRef.current?.abort();
    };
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchError,
    handleSearch,
    resetSearch,
  };
}

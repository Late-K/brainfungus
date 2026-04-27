"use client";

import { useEffect, useState } from "react";

interface FetchDataResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string;
}

export function useFetchData<T>(url: string | null): FetchDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(url !== null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!url) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      try {
        setIsLoading(true);
        setError("");
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Request failed (${res.status})`);
        }
        const json: T = await res.json();
        setData(json);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    load();

    return () => {
      controller.abort();
    };
  }, [url]);

  return { data, isLoading, error };
}

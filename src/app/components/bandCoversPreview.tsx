"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BandCover } from "@/app/types";

const PREVIEW_LIMIT = 3;

export default function BandCoversPreview({ bandId }: { bandId: string }) {
  const [covers, setCovers] = useState<BandCover[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCovers = async () => {
      try {
        setIsLoading(true);
        setError("");
        const res = await fetch(`/api/covers?bandId=${bandId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch covers");
        }
        const data = await res.json();
        setCovers(data.covers || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load covers");
      } finally {
        setIsLoading(false);
      }
    };

    if (bandId) {
      fetchCovers();
    }
  }, [bandId]);

  if (isLoading) {
    return (
      <section className="card">
        <div className="section-header">
          <h2>Band Covers</h2>
        </div>
        <p className="empty-state">Loading covers...</p>
      </section>
    );
  }

  const preview = covers.slice(0, PREVIEW_LIMIT);
  const hasMore = covers.length > PREVIEW_LIMIT;

  return (
    <section className="card">
      <div className="section-header">
        <h2>Band Covers</h2>
        <Link href={`/bands/${bandId}/covers`} className="btn btn--primary">
          View All
        </Link>
      </div>

      {error && <p className="alert alert--error">{error}</p>}

      {covers.length === 0 ? (
        <p className="empty-state">
          No covers yet. <Link href={`/bands/${bandId}/covers`}>Add some!</Link>
        </p>
      ) : (
        <div className="list">
          {preview.map((cover) => (
            <div
              key={cover._id}
              className="card-item card-item-stack card-item-regular"
            >
              <div className="song-info">
                <h3 className="item-title">{cover.title}</h3>
                <p className="meta-text meta-text-small margin-top">
                  {cover.artist}
                  {cover.album ? ` - ${cover.album}` : ""}
                </p>
              </div>
            </div>
          ))}

          {hasMore && (
            <Link href={`/bands/${bandId}/covers`} className="preview-link">
              + {covers.length - PREVIEW_LIMIT} more...
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

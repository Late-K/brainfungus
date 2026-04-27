"use client";

import Link from "next/link";
import { BandCover } from "@/app/types";
import SongInfo from "@/app/components/songInfo";
import { useFetchData } from "@/app/hooks/useFetchData";

const preview_limit = 3;

export default function BandCoversPreview({ bandId }: { bandId: string }) {
  const { data, isLoading, error } = useFetchData<{ covers: BandCover[] }>(
    bandId ? `/api/covers?bandId=${bandId}` : null,
  );
  const covers = data?.covers ?? [];

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

  const dedupedCovers = covers.filter(
    (cover, index, arr) =>
      arr.findIndex((other) => other.songId === cover.songId) === index,
  );
  const preview = dedupedCovers.slice(-preview_limit).reverse();
  const hasMore = dedupedCovers.length > preview_limit;

  return (
    <section className="card">
      <div className="section-header">
        <h2>Band Covers</h2>
        <Link
          href={`/bands/${bandId}/covers`}
          className="button button-primary"
        >
          View All
        </Link>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      {dedupedCovers.length === 0 ? (
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
              <div className="song-row">
                <SongInfo
                  image={cover.image}
                  imageAlt={cover.title}
                  title={cover.title}
                  meta={`${cover.artist}${cover.album ? ` - ${cover.album}` : ""}`}
                  containerClassName="song-info"
                  titleAs="h3"
                  metaAs="p"
                  metaClassName="meta-text meta-text-small margin-top"
                />
              </div>
            </div>
          ))}

          {hasMore && (
            <Link href={`/bands/${bandId}/covers`} className="preview-link">
              + {dedupedCovers.length - preview_limit} more...
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

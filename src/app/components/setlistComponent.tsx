"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Setlist, LearntMap } from "@/app/types";
import { getProgress } from "@/app/lib/setlistUtils";

export default function SetlistComponent({ bandId }: { bandId: string }) {
  const [activeSetlist, setActiveSetlist] = useState<Setlist | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [learntMap, setLearntMap] = useState<LearntMap>({});
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      try {
        setIsLoading(true);

        const [setlistRes, learntRes, bandRes] = await Promise.all([
          fetch(`/api/setlists?bandId=${bandId}`, {
            signal: controller.signal,
          }),
          fetch(`/api/learnt-songs?bandId=${bandId}`, {
            signal: controller.signal,
          }),
          fetch(`/api/bands/${bandId}`, { signal: controller.signal }),
        ]);

        if (controller.signal.aborted) return;

        if (setlistRes.ok) {
          const data = await setlistRes.json();
          const setlists: Setlist[] = data.setlists || [];
          setTotalCount(setlists.length);
          setActiveSetlist(setlists.find((s) => s.isActive) || null);
        }

        if (learntRes.ok) {
          const learntData = await learntRes.json();
          setLearntMap(learntData.learntMap || {});
        }

        if (bandRes.ok) {
          const bandData = await bandRes.json();
          setMemberCount(bandData.band?.members?.length || 0);
        }
      } catch {
        if (controller.signal.aborted) return;
      } finally {
        if (controller.signal.aborted) return;
        setIsLoading(false);
      }
    }

    if (bandId) fetchData();
    return () => controller.abort();
  }, [bandId]);

  if (isLoading) {
    return (
      <section className="card">
        <div className="section-header">
          <h2 className="heading-large">Setlists</h2>
        </div>
        <p className="empty-state">Loading setlists...</p>
      </section>
    );
  }

  const progress = activeSetlist
    ? getProgress(activeSetlist, learntMap, memberCount)
    : 0;

  return (
    <section className="card">
      <div className="section-header">
        <h2 className="heading-large">Setlists</h2>
        {totalCount > 0 && (
          <Link
            href={`/bands/${bandId}/setlists`}
            className="button button-primary"
          >
            View All
          </Link>
        )}
      </div>

      {activeSetlist ? (
        <div className="card-item card-panel card-panel-active">
          <div className="section-header">
            <h4>{activeSetlist.name}</h4>
          </div>
          <p className="meta-text meta-text-medium no-margin">
            {activeSetlist.songs.length} songs
          </p>
          <div className="progress-bar-wrap">
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress-label">{progress}% learnt</span>
          </div>
          <div className="action-row action-row-fill-tertiary">
            <Link
              href={`/bands/${bandId}/setlists/${activeSetlist._id}`}
              className="button button-tertiary"
            >
              View Details
            </Link>
          </div>
        </div>
      ) : (
        <p className="empty-state">
          {totalCount === 0 ? (
            <>
              No setlists yet.{" "}
              <Link href={`/bands/${bandId}/setlists/create`}>Create one!</Link>
            </>
          ) : (
            <>
              No active setlist.{" "}
              <Link href={`/bands/${bandId}/setlists`}>View all setlists</Link>
            </>
          )}
        </p>
      )}
    </section>
  );
}

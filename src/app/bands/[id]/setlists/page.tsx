"use client";

import { use, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import PageLoading from "@/app/components/pageLoading";
import BandSubpageHeader from "@/app/components/bandSubpageHeader";
import {
  deleteSetlistAction,
  setActiveSetlistAction,
  deactivateSetlistAction,
} from "@/app/actions/setlists";
import { Setlist, LearntMap } from "@/app/types";
import { formatDuration, getProgress } from "@/app/lib/setlistUtils";

export default function SetlistsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session, status } = useSession();
  const { id: bandId } = use(params);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [learntMap, setLearntMap] = useState<LearntMap>({});
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError("");

        const [setlistRes, learntRes, bandRes] = await Promise.all([
          fetch(`/api/setlists?bandId=${bandId}`),
          fetch(`/api/learnt-songs?bandId=${bandId}`),
          fetch(`/api/bands/${bandId}`),
        ]);

        if (!setlistRes.ok) throw new Error("Failed to fetch setlists");
        const setlistData = await setlistRes.json();
        setSetlists(setlistData.setlists || []);

        if (learntRes.ok) {
          const learntData = await learntRes.json();
          setLearntMap(learntData.learntMap || {});
        }

        if (bandRes.ok) {
          const bandData = await bandRes.json();
          setMemberCount(bandData.band?.members?.length || 0);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load setlists",
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [bandId]);

  if (status === "loading") return null;
  if (!session) redirect("/login");

  const sortedSetlists = [...setlists].sort((a, b) => {
    if (a.isActive === b.isActive) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return a.isActive ? -1 : 1;
  });

  const handleDelete = async (setlistId: string) => {
    if (!confirm("Are you sure you want to delete this setlist?")) return;

    try {
      await deleteSetlistAction(setlistId);
      setSetlists((prev) => prev.filter((s) => s._id !== setlistId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete setlist");
    }
  };

  const handleSetActive = async (setlistId: string) => {
    if (!bandId) return;

    try {
      await setActiveSetlistAction(bandId, setlistId);
      setSetlists((prev) =>
        prev.map((s) => ({
          ...s,
          isActive: s._id === setlistId,
        })),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to activate setlist");
    }
  };

  const handleDeactivate = async (setlistId: string) => {
    if (!bandId) return;

    try {
      await deactivateSetlistAction(bandId, setlistId);
      setSetlists((prev) =>
        prev.map((s) => ({
          ...s,
          isActive: s._id === setlistId ? false : s.isActive,
        })),
      );
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to deactivate setlist",
      );
    }
  };

  if (isLoading) {
    return <PageLoading message="Loading setlists..." />;
  }

  return (
    <div className="page-container">
      <BandSubpageHeader
        title="Setlists"
        description="Manage your band's setlists, track song readiness, and plan your next performance."
        bandId={bandId}
      />

      <div className="flex-center margin-bottom">
        <Link
          href={`/bands/${bandId}/setlists/create`}
          className="button button-primary"
        >
          + Create Setlist
        </Link>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      {sortedSetlists.length === 0 ? (
        <section className="margin-bottom">
          <p className="empty-state">
            No setlists yet. Create one to get started!
          </p>
        </section>
      ) : (
        <section className="margin-bottom">
          <div className="list margin-horizontal">
            {sortedSetlists.map((setlist) => {
              const progress = getProgress(setlist, learntMap, memberCount);
              const totalDuration = setlist.songs.reduce(
                (sum, song) => sum + song.duration,
                0,
              );

              return (
                <div
                  key={setlist._id}
                  className={`card-item card-panel margin-bottom${setlist.isActive ? " card-panel-active" : ""}`}
                >
                  <div className="section-header">
                    <h4>{setlist.name}</h4>
                    <span className="meta-text meta-text-medium no-margin">
                      {formatDuration(totalDuration)}
                    </span>
                  </div>

                  <p className="meta-text meta-text-medium no-margin">
                    {setlist.songs.length} songs
                  </p>

                  <p className="meta-text meta-text-medium no-margin margin-top">
                    {new Date(setlist.createdAt).toLocaleDateString("en-GB", {
                      timeZone: "Europe/London",
                    })}
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

                  <div className="action-row action-row-center">
                    <Link
                      href={`/bands/${bandId}/setlists/${setlist._id}`}
                      className="button button-tertiary"
                    >
                      View
                    </Link>

                    {setlist.isActive ? (
                      <button
                        onClick={() => handleDeactivate(setlist._id)}
                        className="button button-tertiary"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSetActive(setlist._id)}
                        className="button button-tertiary"
                      >
                        Set Active
                      </button>
                    )}

                    {!setlist.isActive && (
                      <button
                        onClick={() => handleDelete(setlist._id)}
                        className="button button-tertiary button-tertiary-danger"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// selected band page

"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import SetlistsPreview from "@/app/components/setlists/setlistsPreview";
import CustomSongsPreview from "@/app/components/songs/customSongsPreview";
import BandChat from "@/app/components/chat/bandChat";
import BandCoversPreview from "@/app/components/covers/bandCoversPreview";
import BandManagement from "@/app/components/bands/bandManagement";
import PageLoading from "@/app/components/ui/pageLoading";
import PageErrorCard from "@/app/components/ui/pageErrorCard";
import { useFitToViewport } from "@/app/hooks/useFitToViewport";
import { Band } from "@/app/types";

export default function BandDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const { id: bandId } = use(params);
  const [band, setBand] = useState<Band | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  // desktop: the sticky chat column is sized to reach the bottom of the screen
  const sideRef = useFitToViewport<HTMLElement>();

  // signal lets a request for a band you've already left be cancelled, so a
  // slow reply can't replace the band you're looking at now
  const fetchBandDetails = useCallback(
    async (signal?: AbortSignal) => {
      if (!bandId) return;
      try {
        setIsLoading(true);
        setError("");

        const res = await fetch(`/api/bands/${bandId}`, { signal });

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Band not found");
          }
          throw new Error("Failed to fetch band details");
        }

        const data = await res.json();
        if (signal?.aborted) return;
        setBand(data.band);
      } catch (err) {
        if (signal?.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to load band");
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [bandId],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchBandDetails(controller.signal);
    return () => controller.abort();
  }, [fetchBandDetails]);

  const handleLeaveBand = () => {
    router.push("/");
  };

  if (status === "loading") return null;
  if (!session) redirect("/login");

  if (isLoading) {
    return <PageLoading message="Loading band details..." />;
  }

  if (error) {
    return <PageErrorCard error={error} backHref="/" />;
  }

  if (!band) {
    return <PageErrorCard error="Band not found" backHref="/" />;
  }

  return (
    <div className="band-page">
      <div className="row-end">
        {session?.user?.email && (
          <BandManagement
            band={band}
            currentUserEmail={session.user.email}
            onBandUpdated={() => fetchBandDetails()}
            onBandLeft={handleLeaveBand}
          />
        )}
      </div>
      <div
        className={`band-title${band.image ? " band-title-with-image" : ""}`}
      >
        {band.image && (
          <img src={band.image} alt="" className="band-title-image" />
        )}
        <div className="band-title-text">
          <h2>{band.name}</h2>
          {band.description && (
            <p className="band-title-description">{band.description}</p>
          )}
        </div>
      </div>

      {/* chat comes first on mobile, desktop moves it to a side column */}
      <div className="band-layout">
        <aside ref={sideRef} className="band-layout-side">
          <BandChat bandId={band._id} preview />
        </aside>

        <div className="band-layout-main">
          <SetlistsPreview bandId={band._id} />

          <CustomSongsPreview bandId={band._id} />

          <BandCoversPreview bandId={band._id} />
        </div>
      </div>
    </div>
  );
}

// selected band page

"use client";

import { use, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import SetlistComponent from "@/app/components/setlistComponent";
import CustomSongsComponent from "@/app/components/customSongsComponent";
import BandChatComponent from "@/app/components/bandChatComponent";
import BandCoversPreview from "../../components/bandCoversPreview";
import BandManagement from "@/app/components/bandManagement";
import PageLoading from "@/app/components/pageLoading";
import PageErrorCard from "@/app/components/pageErrorCard";
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

  useEffect(() => {
    fetchBandDetails();
  }, [bandId]);

  async function fetchBandDetails() {
    if (!bandId) return;
    try {
      setIsLoading(true);
      setError("");

      const res = await fetch(`/api/bands/${bandId}`);

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Band not found");
        }
        throw new Error("Failed to fetch band details");
      }

      const data = await res.json();
      setBand(data.band);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load band");
    } finally {
      setIsLoading(false);
    }
  }

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
    <div>
      <div className="row-end">
        {session?.user?.email && (
          <BandManagement
            band={band}
            currentUserEmail={session.user.email}
            onBandUpdated={fetchBandDetails}
            onBandLeft={handleLeaveBand}
          />
        )}
      </div>
      <h2>{band.name}</h2>

      {band.description && <p className="text-center">{band.description}</p>}

      <BandChatComponent bandId={band._id} preview />

      <SetlistComponent bandId={band._id} />

      <CustomSongsComponent bandId={band._id} />

      <BandCoversPreview bandId={band._id} />
    </div>
  );
}

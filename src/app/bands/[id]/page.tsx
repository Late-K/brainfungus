// selected band page

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import Link from "next/link";
import SetlistComponent from "@/app/components/setlistComponent";
import CustomSongsComponent from "@/app/components/customSongsComponent";
import BandChatComponent from "@/app/components/bandChatComponent";
import BandCoversPreview from "../../components/bandCoversPreview";
import BandManagement from "@/app/components/bandManagement";
import { Band } from "@/app/types";

export default function BandDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [bandId, setBandId] = useState<string | null>(null);
  const [band, setBand] = useState<Band | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unwrapParams = async () => {
      const { id } = await params;
      setBandId(id);
    };

    unwrapParams();
  }, [params]);

  useEffect(() => {
    if (!bandId) return;

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

  if (!session) redirect("/login");

  if (isLoading) {
    return <div>Loading band details...</div>;
  }

  if (error) {
    return (
      <div>
        <div>{error}</div>
        <div>
          <Link href="/">
            <button>Back to Home</button>
          </Link>
        </div>
      </div>
    );
  }

  if (!band) {
    return (
      <div>
        <div>Band not found</div>
        <div>
          <Link href="/">
            <button>Back to Home</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="band-header-actions">
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

      {band.description && (
        <p className="band-description">{band.description}</p>
      )}

      <BandChatComponent bandId={band._id} preview />

      <SetlistComponent bandId={band._id} />

      <CustomSongsComponent bandId={band._id} />

      <BandCoversPreview bandId={band._id} />
    </div>
  );
}

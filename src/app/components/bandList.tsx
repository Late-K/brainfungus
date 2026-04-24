"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Band } from "@/app/types";
import BandRehearsals from "@/app/components/bandRehearsals";

interface BandListProps {
  refresh?: number;
}

export default function BandList({ refresh = 0 }: BandListProps) {
  const [bands, setBands] = useState<Band[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchBands() {
      try {
        setIsLoading(true);
        setError("");

        const res = await fetch("/api/bands");

        if (!res.ok) {
          throw new Error("Failed to fetch bands");
        }

        const data = await res.json();
        setBands(data.bands ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load bands");
      } finally {
        setIsLoading(false);
      }
    }

    fetchBands();
  }, [refresh]);

  if (isLoading) {
    return <div>Loading bands...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (bands.length === 0) {
    return (
      <p className="empty-state">
        Welcome to Brain Fungus. Press "Create Band" to get started!
      </p>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      {bands.map((band) => (
        <div key={band._id} className="card">
          <Link href={`/bands/${band._id}`}>
            <div className="listing-row">
              <div className="listing-main">
                <h3 className="listing-title">{band.name}</h3>
                {band.description && (
                  <p className="listing-description">{band.description}</p>
                )}
              </div>

              <div className="listing-aside">
                {band.memberIds.length} member
                {band.memberIds.length === 1 ? "" : "s"}
              </div>
            </div>
          </Link>
          <BandRehearsals bandId={band._id} />
        </div>
      ))}
    </div>
  );
}

// main page (band page)

"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import BandList from "./components/bandList";

export default function HomePage() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;
  if (!session) redirect("/login");

  return (
    <>
      <h2>Bands</h2>
      <div className="flex-center">
        <BandList />
      </div>
      <div className="flex-center">
        <Link href="/bands/create" className="button-link">
          Create Band
        </Link>
      </div>
    </>
  );
}

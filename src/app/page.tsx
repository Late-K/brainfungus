// main page (band page)

"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import BandList from "./components/bandList";

export default function HomePage() {
  const { data: session, status } = useSession();

  if (!session) redirect("/login");

  return (
    <>
      <h2>Bands</h2>
      <BandList />
      <div className="flex-center">
        <Link href="/bands/create" className="button-link">
          Create Band
        </Link>
      </div>
    </>
  );
}

// main page (band page)
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Link from "next/link";
import BandList from "./components/bandList";
import { authOptions } from "@/app/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

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

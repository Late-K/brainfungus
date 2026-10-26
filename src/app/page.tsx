// main page (band page)
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import BandList from "@/app/components/bands/bandList";
import BandInvites from "@/app/components/bands/bandInvites";
import { authOptions } from "@/app/lib/server/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <div className="brand-spanned-wrap">
        <Image
          src="/brain-fungus-spanned.png"
          alt="Brain Fungus"
          width={420}
          height={84}
          priority
          className="brand-spanned-image"
        />
      </div>
      <div className="page-heading desktop-only">
        <h1>Your Bands</h1>
        <Link href="/bands/create" className="button button-primary">
          + Create Band
        </Link>
      </div>
      <BandInvites />
      <BandList />
      <div className="flex-center mobile-only">
        <Link href="/bands/create" className="button button-primary">
          + Create Band
        </Link>
      </div>
    </>
  );
}

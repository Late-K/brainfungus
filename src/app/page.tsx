// main page (band page)
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import BandList from "./components/bandList";
import { authOptions } from "@/app/lib/auth";

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

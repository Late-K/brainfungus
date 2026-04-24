// profile page

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import SignOutButton from "@/app/components/signOutButton";
import ProfileCard from "@/app/components/profileCard";
import ProfileLearntSongsPreview from "@/app/components/profileLearntSongsPreview";

export default async function ProfilePage() {
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
      <ProfileCard session={session} />

      <ProfileLearntSongsPreview />

      <div className="row-center">
        <SignOutButton />
      </div>
    </>
  );
}

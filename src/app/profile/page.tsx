// profile page

import { getServerSession } from "next-auth/next";
import { authOptions, getAuthUser } from "@/app/lib/server/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import SignOutButton from "@/app/components/auth/signOutButton";
import ProfileCard from "@/app/components/profile/profileCard";
import LearntSongsPreview from "@/app/components/profile/learntSongsPreview";
import FindPeople from "@/app/components/profile/findPeople";
import { OwnProfile } from "@/app/types";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // read from the db rather than the session, which only has the name and
  // picture google gave at sign in
  const { user } = await getAuthUser();
  const profile: OwnProfile = {
    name: (user.name as string | null) ?? "",
    email: (user.email as string | null) ?? "",
    image: (user.image as string | null) ?? undefined,
    googleName: (user.googleName as string | null) ?? undefined,
    hasCustomName: user.customName === true,
    hasCustomImage: !!user.imageBlobUrl,
  };

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
        <h1>Profile</h1>
      </div>

      <div className="profile-layout">
        <div className="profile-layout-card">
          <ProfileCard profile={profile} />
        </div>

        <div className="profile-layout-songs">
          <LearntSongsPreview />
        </div>

        <div className="profile-layout-people">
          <FindPeople />
        </div>

        <div className="row-center profile-layout-signout">
          <SignOutButton />
        </div>
      </div>
    </>
  );
}

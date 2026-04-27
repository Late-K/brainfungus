// profile/learnt-songs page

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import ProfileLearntSongsComponent from "@/app/components/profileLearntSongsComponent";

export default async function ProfileLearntSongsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <div className="card">
        <div className="section-header">
          <h1 className="heading-small">My Learnt Songs</h1>
          <Link href="/profile" className="button button-tertiary">
            Back to Profile
          </Link>
        </div>
        <p className="meta-text meta-text-medium">
          Songs you have marked as learnt across all your bands, plus any you
          add personally.
        </p>
      </div>

      <ProfileLearntSongsComponent />
    </>
  );
}

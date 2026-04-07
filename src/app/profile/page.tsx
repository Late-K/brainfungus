import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import SignOutButton from "@/app/components/signOutButton";
import Navbar from "@/app/components/navbar";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <main>
        <section className="card">
          <div className="profile-header">
            {session.user?.image ? (
              <img
                src={session.user.image}
                alt="avatar"
                className="profile-avatar"
              />
            ) : (
              <div className="profile-avatar placeholder">
                {session.user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}

            <div className="profile-user">
              <h1>{session.user?.name || "Unknown user"}</h1>
              <p>{session.user?.email || "No email"}</p>
            </div>
          </div>

          <div className="profile-actions">
            <SignOutButton />
          </div>
        </section>
      </main>

      <Navbar />
    </>
  );
}

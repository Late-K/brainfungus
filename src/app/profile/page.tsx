import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import SignInButton from "@/app/components/signInButton";
import Navbar from "@/app/components/navbar";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <main>
        <h1>Your profile</h1>

        <p>
          <strong>Name:</strong> {session.user?.name || "(unknown)"}
        </p>
        <p>
          <strong>Email:</strong> {session.user?.email || "(none)"}
        </p>
        {session.user?.image && (
          <div>
            <img
              src={session.user.image}
              alt="avatar"
              width={80}
              height={80}
              className="rounded-full"
            />
          </div>
        )}
        <SignInButton />
      </main>
      <Navbar />
    </>
  );
}

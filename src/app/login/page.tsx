import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import SignInButton from "@/app/components/signInButton";

interface LoginPageProps {
  searchParams: { callbackUrl?: string };
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getServerSession(authOptions);

  // if we're already logged in, just jump to wherever we were headed
  if (session) {
    redirect(searchParams.callbackUrl || "/");
  }

  const callbackUrl = searchParams.callbackUrl || "/";

  return (
    <>
      {" "}
      <main className="mx-auto max-w-xl p-4">
        <h1 className="text-2xl font-semibold mb-4">Log in</h1>
        <SignInButton callbackUrl={callbackUrl} />
      </main>
    </>
  );
}

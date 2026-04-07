import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import SignInButton from "@/app/components/signInButton";

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);

  if (session) {
    redirect(params.callbackUrl || "/");
  }

  const callbackUrl = params.callbackUrl || "/";

  return (
    <>
      {" "}
      <main>
        <h1>Log in</h1>
        <SignInButton callbackUrl={callbackUrl} />
      </main>
    </>
  );
}

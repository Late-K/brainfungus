//login page

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import SignInButton from "@/app/components/signInButton";
import Image from "next/image";

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
      <div className="login-container">
        <Image
          src="/brainfungus.png"
          alt="Brain Fungus logo"
          width={150}
          height={150}
          priority
          className="brand-login-logo"
        />
        <SignInButton callbackUrl={callbackUrl} />
      </div>
    </>
  );
}

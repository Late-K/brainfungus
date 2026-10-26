//login page

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/server/auth";
import { redirect } from "next/navigation";
import SignInButton from "@/app/components/auth/signInButton";
import Image from "next/image";
import { safeRedirectPath } from "@/app/lib/utils";

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);
  const callbackUrl = safeRedirectPath(params.callbackUrl);

  if (session) {
    redirect(callbackUrl);
  }

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

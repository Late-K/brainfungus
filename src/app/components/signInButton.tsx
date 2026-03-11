"use client";

import { useSession, signIn, signOut } from "next-auth/react";

type Props = {
  /**
   * Where to send users after they successfully authenticate.  Defaults to
   * root of the site.
   */
  callbackUrl?: string;
};

export default function Component({ callbackUrl }: Props = {}) {
  const { data: session } = useSession();
  if (session) {
    return (
      <>
        <button onClick={() => signOut()}>Sign out</button>
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => signIn("google", { callbackUrl: callbackUrl || "/" })}
      >
        Sign in with Google
      </button>
    </>
  );
}

"use client";

import { signOut } from "next-auth/react";
import { removePushSubscriptionAction } from "@/app/actions/notifications";
import { unsubscribeFromPush } from "@/app/lib/pushClient";

export default function LogoutButton() {
  // stop this device getting the old account's notifications after signing out
  const handleSignOut = async () => {
    try {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) await removePushSubscriptionAction(endpoint);
    } catch (err) {
      console.error("Failed to remove push subscription:", err);
    }
    signOut();
  };

  return (
    <button className="button button-primary" onClick={handleSignOut}>
      Sign out
    </button>
  );
}

import "server-only";

// auth setup with next-auth and google

import { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import { getDb } from "@/app/lib/server/mongodb";
import { getServerSession } from "next-auth/next";
import { UserError } from "@/app/lib/actionResult";
import { safeRedirectPath } from "@/app/lib/utils";

export const authOptions: NextAuthOptions = {
  providers: [
    Google({
      clientId: process.env.CLIENT_ID!,
      clientSecret: process.env.CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;

      try {
        const db = await getDb();
        const users = db.collection("users");

        // the google name and picture are always kept, but only shown when
        // the user hasn't set their own
        const existing = await users.findOne(
          { email: user.email },
          { projection: { customName: 1, imageBlobUrl: 1 } },
        );
        const $set: Record<string, unknown> = {
          email: user.email,
          googleName: user.name ?? null,
          googleImage: user.image ?? null,
          updatedAt: new Date(),
        };
        if (!existing?.customName) $set.name = user.name ?? null;
        if (!existing?.imageBlobUrl) $set.image = user.image ?? null;

        await users.updateOne(
          { email: user.email },
          {
            $set,
            $setOnInsert: {
              createdAt: new Date(),
            },
          },
          { upsert: true },
        );

        return true;
      } catch (error) {
        console.error("Error saving user to MongoDB:", error);
        return false;
      }
    },

    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string | undefined;
        session.user.name = token.name as string | undefined;
        session.user.image = token.picture as string | undefined;
      }
      return session;
    },

    // only ever send people somewhere on this site. a prefix check isn't
    // enough - "https://site.app.evil.com" starts with "https://site.app"
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return baseUrl + safeRedirectPath(url);
      }
      try {
        if (new URL(url).origin === new URL(baseUrl).origin) return url;
      } catch {
        // not a valid url
      }
      return baseUrl + "/";
    },
  },
};

// helper func to get current authenticated user sessions and db instance
export async function getAuthUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new UserError("Unauthorized");

  const db = await getDb();
  const user = await db
    .collection("users")
    .findOne({ email: session.user.email });
  if (!user) throw new UserError("User not found");

  return { db, user, session };
}

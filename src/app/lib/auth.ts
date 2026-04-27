// auth setup with next-auth and google

import { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import { getDb } from "@/app/lib/mongodb";
import { getServerSession } from "next-auth/next";

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

        await users.updateOne(
          { email: user.email },
          {
            $set: {
              name: user.name ?? null,
              email: user.email,
              image: user.image ?? null,
              updatedAt: new Date(),
            },
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

    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) {
        return url;
      }
      return baseUrl + "/";
    },
  },
};

// helper func to get current authenticated user sessions and db instance
export async function getAuthUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const db = await getDb();
  const user = await db
    .collection("users")
    .findOne({ email: session.user.email });
  if (!user) throw new Error("User not found");

  return { db, user, session };
}

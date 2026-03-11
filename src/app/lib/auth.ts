import { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import clientPromise from "@/app/lib/mongodb";

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
      // Only handle Google sign-ins
      if (account?.provider !== "google") return true;
      if (!user.email) return false;

      try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB);
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
      // On first sign-in, copy useful user data into the JWT
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

    // redirect callback is invoked after sign in/out/etc.  by default NextAuth
    // returns the URL it was originally called with.  we primarily rely on the
    // `callbackUrl` passed to `signIn` to decide where to land, but when nothing
    // is provided we fall back to the app root.
    async redirect({ url, baseUrl }) {
      // if the url already refers to our own site (e.g. the callbackUrl was
      // passed through) just honour it.
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // otherwise default to the home page
      return baseUrl + "/";
    },
  },
};

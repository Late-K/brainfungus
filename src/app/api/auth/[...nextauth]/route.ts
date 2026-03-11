import NextAuth from "next-auth";
import { authOptions } from "@/app/lib/auth";
// import Google from "next-auth/providers/google";

const handler = NextAuth(
  authOptions,

  //   {
  //   providers: [
  //     Google({
  //       clientId: process.env.CLIENT_ID!,
  //       clientSecret: process.env.CLIENT_SECRET!,
  //     }),
  //   ],
  // }
);

export { handler as GET, handler as POST };

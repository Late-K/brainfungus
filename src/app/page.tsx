import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import Navbar from "./components/navbar";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <div>
        <h1>Welcome to the Home Page</h1>
      </div>
      <Navbar />
    </>
  );
}

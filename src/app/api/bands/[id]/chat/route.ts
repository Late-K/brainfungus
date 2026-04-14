import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { getDb } from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: bandId } = await params;

  if (!ObjectId.isValid(bandId)) {
    return Response.json({ error: "Invalid band ID" }, { status: 400 });
  }

  try {
    const db = await getDb();

    // fetch messages for the band
    const messages = await db
      .collection("band_messages")
      .find({ bandId: new ObjectId(bandId) })
      .sort({ createdAt: 1 })
      .limit(100)
      .toArray();

    return Response.json({ messages });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return Response.json(
      { error: "Failed to fetch messages" },
      { status: 500 },
    );
  }
}

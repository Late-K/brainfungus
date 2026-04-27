import { ObjectId } from "mongodb";
import {
  getServerErrorStatus,
  requireBandMemberContext,
} from "@/app/lib/serverUtils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: bandId } = await params;

  try {
    const { db, bandObjectId } = await requireBandMemberContext(bandId);

    // fetch messages for the band
    const rawMessages = await db
      .collection("band_messages")
      .find({ bandId: bandObjectId })
      .sort({ createdAt: 1 })
      .limit(100)
      .toArray();

    // resolve user details for messages that don't have them embedded
    const userIds = [
      ...new Set(
        rawMessages
          .filter((m) => !m.userEmail)
          .map((m) => m.userId)
          .filter((id) => id && ObjectId.isValid(id.toString()))
          .map((id) => new ObjectId(id.toString())),
      ),
    ];

    const userMap: Record<
      string,
      { email: string; name: string; image?: string | null }
    > = {};
    if (userIds.length > 0) {
      const users = await db
        .collection("users")
        .find({ _id: { $in: userIds } })
        .project({ email: 1, name: 1, image: 1 })
        .toArray();
      for (const u of users) {
        userMap[u._id.toString()] = {
          email: u.email,
          name: u.name,
          image: u.image,
        };
      }
    }

    const messages = rawMessages.map((m) => {
      const uid = m.userId?.toString();
      const resolved = uid ? userMap[uid] : undefined;
      return {
        ...m,
        _id: m._id.toString(),
        bandId: m.bandId?.toString(),
        userId: uid,
        userEmail: m.userEmail ?? resolved?.email ?? "",
        userName: m.userName ?? resolved?.name ?? "Unknown",
        userImage: m.userImage ?? resolved?.image ?? null,
      };
    });

    return Response.json({ messages });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    const status = getServerErrorStatus(error);
    return Response.json(
      {
        error:
          status === 500
            ? "Failed to fetch messages"
            : (error as Error).message,
      },
      { status },
    );
  }
}

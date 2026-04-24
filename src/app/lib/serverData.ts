import { getAuthUser } from "@/app/lib/auth";
import { Db, ObjectId } from "mongodb";

export const COLLECTIONS = {
  bands: "bands",
  bandMessages: "band_messages",
  covers: "covers",
  customSongs: "customSongs",
  learntSongs: "learnt_songs",
  personalLearntSongs: "personal_learnt_songs",
  rehearsalAvailability: "rehearsal_availability",
  rehearsals: "rehearsals",
  setlists: "setlists",
  users: "users",
} as const;

export function normaliseSongId(value: unknown) {
  return String(value ?? "");
}

export function getSongIdCandidates(value: unknown) {
  const songId = normaliseSongId(value);
  const candidates: Array<string | number> = [songId];

  if (/^\d+$/.test(songId)) {
    candidates.push(Number(songId));
  }

  return candidates;
}

export function getSongIdFilter(value: unknown) {
  return { $in: getSongIdCandidates(value) };
}

function toObjectId(value: string | ObjectId, label: string) {
  if (value instanceof ObjectId) {
    return value;
  }

  if (!ObjectId.isValid(value)) {
    throw new Error(`Invalid ${label}`);
  }

  return new ObjectId(value);
}

export async function requireBandMember(
  db: Db,
  userId: string,
  bandId: string | ObjectId,
) {
  const bandObjectId = toObjectId(bandId, "band ID");
  const band = await db
    .collection(COLLECTIONS.bands)
    .findOne({ _id: bandObjectId });

  if (!band) {
    throw new Error("Band not found");
  }

  if (!band.memberIds.includes(userId)) {
    throw new Error("Not a member of this band");
  }

  return { band, bandObjectId };
}

export async function requireBandMemberContext(bandId: string | ObjectId) {
  const auth = await getAuthUser();
  const { band, bandObjectId } = await requireBandMember(
    auth.db,
    auth.user._id.toString(),
    bandId,
  );

  return {
    ...auth,
    band,
    bandObjectId,
  };
}

export function getServerErrorStatus(error: unknown) {
  if (!(error instanceof Error)) {
    return 500;
  }

  switch (error.message) {
    case "Unauthorized":
      return 401;
    case "Invalid band ID":
    case "Invalid setlist ID":
      return 400;
    case "User not found":
    case "Band not found":
    case "Setlist not found":
      return 404;
    case "Not a member of this band":
      return 403;
    default:
      return 500;
  }
}

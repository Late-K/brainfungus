import "server-only";

import { getAuthUser } from "@/app/lib/server/auth";
import { UserError } from "@/app/lib/actionResult";
import { Db, Document, ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export function normaliseSongId(value: unknown) {
  return String(value ?? "");
}

// a mongo id from the browser, rejecting anything that isn't a valid id string
export function toObjectId(value: unknown, label: string) {
  if (value instanceof ObjectId) {
    return value;
  }

  if (typeof value !== "string" || !ObjectId.isValid(value)) {
    throw new UserError(`Invalid ${label}`);
  }

  return new ObjectId(value);
}

// mongo ids for every valid id string in the list, skipping the rest
export function toObjectIds(values: unknown[]) {
  return values
    .filter((v): v is string => typeof v === "string" && ObjectId.isValid(v))
    .map((v) => new ObjectId(v));
}

export function getMemberIds(band: Document) {
  return ((band.members as Array<{ userId: string }>) ?? []).map(
    (m) => m.userId,
  );
}

export function isBandMember(band: Document, userId: string) {
  return getMemberIds(band).includes(userId);
}

export async function requireBandMember(
  db: Db,
  userId: string,
  bandId: unknown,
) {
  const bandObjectId = toObjectId(bandId, "band ID");
  const band = await db.collection("bands").findOne({ _id: bandObjectId });

  if (!band) {
    throw new UserError("Band not found");
  }

  if (!isBandMember(band, userId)) {
    throw new UserError("Not a member of this band");
  }

  return { band, bandObjectId };
}

export async function requireBandMemberContext(bandId: unknown) {
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
  if (!(error instanceof UserError)) {
    return 500;
  }

  switch (error.message) {
    case "Unauthorized":
      return 401;
    case "User not found":
    case "Band not found":
    case "Setlist not found":
    case "Song not found":
    case "Rehearsal not found":
      return 404;
    case "Not a member of this band":
    case "Not authorized":
      return 403;
    default:
      return 400;
  }
}

// the json error response for an api route. user facing errors keep their
// message, anything unexpected is logged and reported as the fallback
export function serverErrorResponse(error: unknown, fallback: string) {
  console.error(`${fallback}:`, error);
  const status = getServerErrorStatus(error);
  return NextResponse.json(
    { error: status === 500 ? fallback : (error as Error).message },
    { status },
  );
}

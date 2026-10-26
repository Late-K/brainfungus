import "server-only";

import { Db, ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/app/lib/server/auth";
import { UserError } from "@/app/lib/actionResult";
import { serverErrorResponse } from "@/app/lib/server/utils";
import { streamPrivateBlob } from "@/app/lib/server/blobStorage";

// custom song, album and band images live in private blob storage like song
// audio, and are served through /api/songs/[id]/image, /api/albums/[id]/image
// and /api/bands/[id]/image.
// albums are just a name on each song, so album images are kept in their own
// custom_albums collection keyed by band + album name

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export function validateImageFile(file: unknown): File {
  if (!(file instanceof File)) throw new UserError("No image file provided");
  if (!ALLOWED_IMAGE_TYPES.includes(file.type))
    throw new UserError("Unsupported image format - use JPG, PNG, WebP or GIF");
  if (file.size > MAX_IMAGE_BYTES)
    throw new UserError("Image too large - max 4 MB");
  return file;
}

export function buildImageBlobPath(
  kind: "songs" | "albums" | "bands",
  bandId: unknown,
  ownerId: string,
  fileName: string,
): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `images/${kind}/${String(bandId)}/${ownerId}/${Date.now()}-${safeName}`;
}

// versioned so browsers pick up a replaced image straight away
export function songImageUrl(songId: string, version: number) {
  return `/api/songs/${songId}/image?v=${version}`;
}

export function albumImageUrl(albumId: string, version: number) {
  return `/api/albums/${albumId}/image?v=${version}`;
}

export function bandImageUrl(bandId: string, version: number) {
  return `/api/bands/${bandId}/image?v=${version}`;
}

export function albumImageKey(bandId: unknown, albumName: string) {
  return `${String(bandId)}|${albumName}`;
}

// album image urls for the given bands, keyed with albumImageKey
export async function getAlbumImages(
  db: Db,
  bandIds: ObjectId[],
): Promise<Map<string, string>> {
  if (bandIds.length === 0) return new Map();

  const albums = await db
    .collection("custom_albums")
    .find(
      { bandId: { $in: bandIds }, image: { $exists: true } },
      { projection: { bandId: 1, name: 1, image: 1 } },
    )
    .toArray();

  return new Map(
    albums.map((album) => [
      albumImageKey(album.bandId, album.name as string),
      album.image as string,
    ]),
  );
}

// streams a private blob image back to the browser
export function streamBlobImage(blobUrl: string, mimeType?: string) {
  return streamPrivateBlob(blobUrl, {
    headers: {
      "Content-Type": mimeType || "image/jpeg",
      // urls carry a ?v= version, so a cached copy never goes stale
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}

// the GET handler for a custom song or album image. any signed in user can
// view these, since custom songs also show up on other people's learnt songs
export async function streamStoredImage(
  collection: "custom_songs" | "custom_albums",
  id: string,
) {
  try {
    const { db } = await getAuthUser();
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const doc = await db
      .collection(collection)
      .findOne(
        { _id: new ObjectId(id) },
        { projection: { imageBlobUrl: 1, imageMimeType: 1 } },
      );

    const blobUrl = doc?.imageBlobUrl as string | undefined;
    if (!blobUrl) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    return streamBlobImage(blobUrl, doc?.imageMimeType as string | undefined);
  } catch (error) {
    return serverErrorResponse(error, "Failed to load image");
  }
}

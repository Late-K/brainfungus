import { Db, ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// custom song and album images live in private blob storage like song audio,
// and are served through /api/songs/[id]/image and /api/albums/[id]/image.
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
  if (!(file instanceof File)) throw new Error("No image file provided");
  if (!ALLOWED_IMAGE_TYPES.includes(file.type))
    throw new Error("Unsupported image format - use JPG, PNG, WebP or GIF");
  if (file.size > MAX_IMAGE_BYTES)
    throw new Error("Image too large - max 4 MB");
  return file;
}

export function buildImageBlobPath(
  kind: "songs" | "albums",
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
export async function streamBlobImage(blobUrl: string, mimeType?: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const blobResponse = await fetch(blobUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });

  if (!blobResponse.ok || !blobResponse.body) {
    return NextResponse.json(
      { error: "Image file unavailable" },
      { status: 502 },
    );
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    mimeType || blobResponse.headers.get("content-type") || "image/jpeg",
  );
  const contentLength = blobResponse.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);
  // urls carry a ?v= version, so a cached copy never goes stale
  headers.set("Cache-Control", "private, max-age=31536000, immutable");

  return new NextResponse(blobResponse.body, { status: 200, headers });
}

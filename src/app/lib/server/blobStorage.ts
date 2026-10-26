import "server-only";

// helpers for the private blob store that holds song audio, images and chat
// attachments. nothing in it is public - files reach the browser through our
// own routes, which check who is asking first

import { del } from "@vercel/blob";
import { NextResponse } from "next/server";

// removes files from blob storage. a failure only leaves an orphaned file
// behind, so it's logged rather than failing whatever is being deleted
export async function deleteBlobsQuietly(urls: unknown, label: string) {
  const list = (Array.isArray(urls) ? urls : [urls]).filter(
    (url): url is string => typeof url === "string" && url !== "",
  );
  if (list.length === 0) return;
  try {
    await del(list);
  } catch (blobErr) {
    console.error(`Failed to delete ${label} blob:`, blobErr);
  }
}

// streams a private blob back to the browser with the given headers. range
// requests are passed through so audio and video can seek
export async function streamPrivateBlob(
  blobUrl: string,
  {
    range,
    headers,
  }: { range?: string | null; headers: Record<string, string> },
) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const blobHeaders: Record<string, string> = {};
  if (token) blobHeaders.Authorization = `Bearer ${token}`;
  if (range) blobHeaders.Range = range;

  const blobResponse = await fetch(blobUrl, {
    headers: blobHeaders,
    cache: "no-store",
  });

  if (!blobResponse.ok || !blobResponse.body) {
    return NextResponse.json({ error: "File unavailable" }, { status: 502 });
  }

  const responseHeaders = new Headers(headers);
  if (!responseHeaders.has("Content-Type")) {
    responseHeaders.set(
      "Content-Type",
      blobResponse.headers.get("content-type") || "application/octet-stream",
    );
  }
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  responseHeaders.set("Accept-Ranges", "bytes");
  for (const name of ["content-length", "content-range"]) {
    const value = blobResponse.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  return new NextResponse(blobResponse.body, {
    status: blobResponse.status,
    headers: responseHeaders,
  });
}

import { streamStoredImage } from "@/app/lib/server/customSongImages";

// custom album image, viewable by any signed in user like song images
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return streamStoredImage("custom_albums", id);
}

import { streamStoredImage } from "@/app/lib/server/customSongImages";

// custom song image
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return streamStoredImage("custom_songs", id);
}

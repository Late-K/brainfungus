import { NextRequest } from "next/server";
import { serverErrorResponse } from "@/app/lib/server/utils";
import { listGifs } from "@/app/lib/server/giphy";

// GET                       trending gifs
// GET ?q=<text>             gifs matching a search
// GET ...&offset=<number>   the next page of either
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = (searchParams.get("q") || "").trim().slice(0, 100);
  const offset = Number.parseInt(searchParams.get("offset") || "0", 10) || 0;

  try {
    const page = await listGifs(query, offset);
    // the same search is often repeated while typing, so let the browser
    // keep it for a few minutes
    return Response.json(page, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    return serverErrorResponse(error, "Failed to load GIFs");
  }
}

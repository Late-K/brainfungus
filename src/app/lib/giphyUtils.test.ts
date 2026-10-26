import { describe, expect, it } from "vitest";
import { isGiphyId, isGiphyUrl, mapGiphyGif } from "@/app/lib/giphyUtils";

const raw = {
  id: "abc123",
  title: " Dancing Cat GIF ",
  images: {
    original: {
      url: "https://media2.giphy.com/media/abc123/giphy.gif",
      mp4: "https://media2.giphy.com/media/abc123/giphy.mp4",
      width: "480",
      height: "270",
    },
    fixed_width: {
      url: "https://media2.giphy.com/media/abc123/200w.gif",
      webp: "https://media2.giphy.com/media/abc123/200w.webp",
      width: "200",
      height: "113",
    },
  },
};

describe("isGiphyUrl", () => {
  it("only allows https links on giphy's own hosts", () => {
    expect(isGiphyUrl("https://media.giphy.com/a.mp4")).toBe(true);
    expect(isGiphyUrl("https://i.giphy.com/a.webp")).toBe(true);
    expect(isGiphyUrl("http://media.giphy.com/a.mp4")).toBe(false);
    expect(isGiphyUrl("https://giphy.com.evil.example/a.mp4")).toBe(false);
    expect(isGiphyUrl("https://evilgiphy.com/a.mp4")).toBe(false);
    expect(isGiphyUrl("javascript:alert(1)")).toBe(false);
    expect(isGiphyUrl(undefined)).toBe(false);
  });
});

describe("isGiphyId", () => {
  it("accepts short alphanumeric ids only", () => {
    expect(isGiphyId("abc123")).toBe(true);
    expect(isGiphyId("../search")).toBe(false);
    expect(isGiphyId("")).toBe(false);
    expect(isGiphyId(42)).toBe(false);
  });
});

describe("mapGiphyGif", () => {
  it("keeps the mp4, the webp preview and the size", () => {
    expect(mapGiphyGif(raw)).toEqual({
      id: "abc123",
      title: "Dancing Cat GIF",
      url: "https://media2.giphy.com/media/abc123/giphy.mp4",
      previewUrl: "https://media2.giphy.com/media/abc123/200w.webp",
      width: 480,
      height: 270,
    });
  });

  it("drops gifs with missing or foreign media", () => {
    expect(mapGiphyGif(undefined)).toBeNull();
    expect(
      mapGiphyGif({
        ...raw,
        images: {
          ...raw.images,
          original: { ...raw.images.original, mp4: "https://evil.example/x" },
        },
      }),
    ).toBeNull();
    expect(
      mapGiphyGif({
        ...raw,
        images: { ...raw.images, original: { ...raw.images.original, width: "0" } },
      }),
    ).toBeNull();
  });
});

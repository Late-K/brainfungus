import { describe, expect, it } from "vitest";
import { UserError } from "@/app/lib/actionResult";
import {
  readDateStr,
  readOneOf,
  readOptionalTime,
  readSongInput,
  readSongMediaUrl,
  readString,
  readStringArray,
} from "@/app/lib/validate";

describe("readString", () => {
  it("accepts strings", () => {
    expect(readString("abc", "name")).toBe("abc");
  });

  it("rejects mongo operator objects", () => {
    expect(() => readString({ $ne: null }, "song")).toThrow(UserError);
  });

  it("rejects strings over the limit", () => {
    expect(() => readString("abcdef", "name", 5)).toThrow("name is too long");
  });
});

describe("readOneOf", () => {
  it("only allows the listed values", () => {
    expect(readOneOf("weekly", ["once", "weekly"], "repeat")).toBe("weekly");
    expect(() => readOneOf("daily", ["once", "weekly"], "repeat")).toThrow(
      "Invalid repeat",
    );
  });
});

describe("dates and times", () => {
  it("accepts YYYY-MM-DD only", () => {
    expect(readDateStr("2026-10-26")).toBe("2026-10-26");
    expect(() => readDateStr("26/10/2026")).toThrow(UserError);
    expect(() => readDateStr({ $gt: "" })).toThrow(UserError);
  });

  it("treats an empty time as no time", () => {
    expect(readOptionalTime("", "start time")).toBeUndefined();
    expect(readOptionalTime("19:30", "start time")).toBe("19:30");
    expect(() => readOptionalTime("7pm", "start time")).toThrow(UserError);
  });
});

describe("readStringArray", () => {
  it("rejects non-arrays and non-string items", () => {
    expect(readStringArray(["a", "b"], "ids")).toEqual(["a", "b"]);
    expect(() => readStringArray("a", "ids")).toThrow(UserError);
    expect(() => readStringArray(["a", 1], "ids")).toThrow(UserError);
  });
});

describe("readSongMediaUrl", () => {
  it("keeps deezer cdn links", () => {
    const url = "https://cdn-images.dzcdn.net/images/cover/abc/250x250.jpg";
    expect(readSongMediaUrl(url)).toBe(url);
  });

  it("keeps our own custom song routes", () => {
    const path = "/api/songs/0123456789abcdef01234567/image?v=12";
    expect(readSongMediaUrl(path)).toBe(path);
  });

  it("drops links to anywhere else", () => {
    expect(readSongMediaUrl("https://evil.example/pixel.gif")).toBeUndefined();
    expect(
      readSongMediaUrl("https://dzcdn.net.evil.example/a.jpg"),
    ).toBeUndefined();
    expect(
      readSongMediaUrl("http://cdn-images.dzcdn.net/a.jpg"),
    ).toBeUndefined();
    expect(readSongMediaUrl("javascript:alert(1)")).toBeUndefined();
  });
});

describe("readSongInput", () => {
  it("keeps only the stored fields", () => {
    const song = readSongInput({
      id: 123,
      title: "Song",
      artist: "Artist",
      duration: 200,
      image: "https://evil.example/a.jpg",
      audioUrl: "/api/songs/x/audio",
      extra: "ignored",
    });
    expect(song).toEqual({
      id: "123",
      title: "Song",
      artist: "Artist",
      album: undefined,
      duration: 200,
      preview: undefined,
      image: undefined,
      isCustom: undefined,
      isCover: undefined,
    });
  });

  it("rejects a missing id", () => {
    expect(() => readSongInput({ title: "Song" })).toThrow(UserError);
    expect(() => readSongInput(null)).toThrow(UserError);
  });
});

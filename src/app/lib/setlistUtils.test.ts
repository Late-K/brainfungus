import { describe, expect, it } from "vitest";
import {
  currentUserLearnt,
  formatDuration,
  getProgress,
  toSetlistSong,
} from "@/app/lib/setlistUtils";
import { LearntMap, Setlist } from "@/app/types";

const learner = (email: string) => ({
  userId: email,
  userName: email,
  userEmail: email,
});

describe("formatDuration", () => {
  it("formats seconds as m:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(599.6)).toBe("10:00");
  });

  it("treats missing or broken values as 0", () => {
    expect(formatDuration(undefined)).toBe("0:00");
    expect(formatDuration(NaN)).toBe("0:00");
    expect(formatDuration(-5)).toBe("0:00");
  });
});

describe("getProgress", () => {
  const setlist = {
    songs: [
      { id: "1", title: "A", duration: 0 },
      { id: "2", title: "B", duration: 0 },
    ],
  } as Setlist;

  it("is the share of song/member pairs that are learnt", () => {
    const learntMap: LearntMap = {
      "1": [learner("a"), learner("b")],
      "2": [learner("a")],
    };
    expect(getProgress(setlist, learntMap, 2)).toBe(75);
  });

  it("is 0 for an empty setlist or band", () => {
    expect(getProgress({ songs: [] } as unknown as Setlist, {}, 2)).toBe(0);
    expect(getProgress(setlist, {}, 0)).toBe(0);
  });
});

describe("currentUserLearnt", () => {
  it("matches the signed in user by email", () => {
    const learntMap: LearntMap = { "1": [learner("me@x.com")] };
    expect(currentUserLearnt("1", learntMap, "me@x.com")).toBe(true);
    expect(currentUserLearnt("1", learntMap, "you@x.com")).toBe(false);
    expect(currentUserLearnt("1", learntMap, null)).toBe(false);
  });
});

describe("toSetlistSong", () => {
  it("stores custom songs as just their id", () => {
    expect(
      toSetlistSong({
        id: "abc",
        title: "Mine",
        duration: 100,
        isCustom: true,
      }),
    ).toEqual({ id: "abc", isCustom: true });
  });
});

import { describe, expect, it } from "vitest";
import {
  activeMentionQuery,
  findMentions,
  mentionSuggestions,
  mentionsUser,
  splitMentions,
} from "@/app/lib/chatMentions";

const members = [
  { userId: "1", name: "Sam" },
  { userId: "2", name: "Sam Lee" },
  { userId: "3", name: "Alex" },
];

describe("findMentions", () => {
  it("finds members by name, preferring the longest match", () => {
    expect(findMentions("hey @Sam Lee and @alex!", members)).toEqual([
      { userId: "2", name: "Sam Lee" },
      { userId: "3", name: "alex" },
    ]);
    expect(findMentions("@Sam, you in?", members)).toEqual([
      { userId: "1", name: "Sam" },
    ]);
  });

  it("only counts each person once", () => {
    expect(findMentions("@Alex @Alex", members)).toHaveLength(1);
  });

  it("handles @everyone", () => {
    expect(findMentions("@everyone practice moved", members)).toEqual([
      { userId: "everyone", name: "everyone" },
    ]);
  });

  it("ignores emails and partial names", () => {
    expect(findMentions("mail sam@example.com", members)).toEqual([]);
    expect(findMentions("@Samantha", members)).toEqual([]);
    expect(findMentions("@Alexander", members)).toEqual([]);
  });
});

describe("splitMentions", () => {
  it("splits out mentions from the text around them", () => {
    const mentions = [{ userId: "2", name: "Sam Lee" }];
    expect(splitMentions("hi @Sam Lee!", mentions)).toEqual([
      { text: "hi " },
      { text: "@Sam Lee", mention: mentions[0] },
      { text: "!" },
    ]);
  });

  it("leaves text alone when nobody is mentioned", () => {
    expect(splitMentions("hi @Sam", [])).toEqual([{ text: "hi @Sam" }]);
  });
});

describe("mentionsUser", () => {
  it("counts direct mentions and @everyone", () => {
    expect(mentionsUser([{ userId: "1", name: "Sam" }], "1")).toBe(true);
    expect(mentionsUser([{ userId: "everyone", name: "everyone" }], "1")).toBe(
      true,
    );
    expect(mentionsUser([{ userId: "3", name: "Alex" }], "1")).toBe(false);
    expect(mentionsUser(undefined, "1")).toBe(false);
  });
});

describe("activeMentionQuery", () => {
  it("finds the @ being typed before the caret", () => {
    expect(activeMentionQuery("hi @Sa", 6)).toEqual({ start: 3, query: "Sa" });
    expect(activeMentionQuery("@Sam L", 6)).toEqual({
      start: 0,
      query: "Sam L",
    });
  });

  it("ignores emails and finished lines", () => {
    expect(activeMentionQuery("sam@ex", 6)).toBeNull();
    expect(activeMentionQuery("@Sam\nhi", 7)).toBeNull();
    expect(activeMentionQuery("no mention", 10)).toBeNull();
  });
});

describe("mentionSuggestions", () => {
  it("matches the start of any word in a name", () => {
    expect(mentionSuggestions("le", members).map((m) => m.userId)).toEqual([
      "2",
    ]);
    expect(mentionSuggestions("sam", members).map((m) => m.userId)).toEqual([
      "1",
      "2",
    ]);
  });

  it("offers @everyone", () => {
    expect(mentionSuggestions("ev", members)).toEqual([
      { userId: "everyone", name: "everyone" },
    ]);
  });
});

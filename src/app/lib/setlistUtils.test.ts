import { describe, expect, it } from "vitest";
import {
  canAddProfileSong,
  currentUserLearnt,
  formatDuration,
  getProgress,
  arrangeSonglistBands,
  coverToSetlistSong,
  privateSongBandId,
  profileSongToSetlistSong,
  toSetlistSong,
} from "@/app/lib/setlistUtils";
import {
  LearntMap,
  ProfileLearntSong,
  Setlist,
  UserSonglistBand,
} from "@/app/types";

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

const profileSong = (song: Partial<ProfileLearntSong>): ProfileLearntSong => ({
  id: "entry",
  songId: "123",
  title: "Song",
  isCustom: false,
  source: "personal",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...song,
});

describe("profileSongToSetlistSong", () => {
  it("uses the song's own id, not the list entry's", () => {
    expect(
      profileSongToSetlistSong(
        profileSong({ artist: "Band", duration: 90, preview: "p" }),
      ),
    ).toMatchObject({
      id: "123",
      artist: "Band",
      duration: 90,
      preview: "p",
      isCustom: false,
    });
  });

  it("shows another band's custom song as by that band", () => {
    expect(
      profileSongToSetlistSong(
        profileSong({
          isCustom: true,
          bandName: "Other Band",
          preview: "/api/songs/abc/audio",
        }),
      ),
    ).toMatchObject({
      artist: "Other Band",
      preview: undefined,
      duration: 0,
      isCustom: true,
    });
  });
});

describe("canAddProfileSong", () => {
  it("allows deezer songs and other bands' public custom songs", () => {
    expect(canAddProfileSong(profileSong({}), "band")).toBe(true);
    expect(
      canAddProfileSong(
        profileSong({ isCustom: true, bandId: "other" }),
        "band",
      ),
    ).toBe(true);
  });

  it("skips this band's own and other bands' private custom songs", () => {
    expect(
      canAddProfileSong(
        profileSong({ isCustom: true, bandId: "band" }),
        "band",
      ),
    ).toBe(false);
    expect(
      canAddProfileSong(
        profileSong({ isCustom: true, bandId: "other", isPrivate: true }),
        "band",
      ),
    ).toBe(false);
  });
});

describe("privateSongBandId", () => {
  it("is the band only for private custom songs", () => {
    expect(privateSongBandId(profileSong({}))).toBeUndefined();
    expect(
      privateSongBandId(profileSong({ isCustom: true, bandId: "a" })),
    ).toBeUndefined();
    expect(
      privateSongBandId(
        profileSong({ isCustom: true, bandId: "a", isPrivate: true }),
      ),
    ).toBe("a");
  });
});

describe("arrangeSonglistBands", () => {
  const band = (_id: string, setlistIds: string[] = []): UserSonglistBand => ({
    _id,
    name: `Band ${_id}`,
    coverSongIds: [],
    setlists: setlistIds.map((id) => ({
      _id: id,
      name: id,
      isActive: false,
      songIds: [],
    })),
  });
  const bands = [band("a", ["a1", "a2"]), band("b"), band("c", ["c1"])];
  const summary = (arranged: ReturnType<typeof arrangeSonglistBands>) =>
    arranged.map((b) => [
      b._id,
      b.canHoldCover,
      b.setlists.map((setlist) => setlist._id),
    ]);

  it("offers every band's covers and setlists in the server's order", () => {
    expect(summary(arrangeSonglistBands(bands, {}))).toEqual([
      ["a", true, ["a1", "a2"]],
      ["b", true, []],
      ["c", true, ["c1"]],
    ]);
  });

  it("puts the given bands first", () => {
    const arranged = arrangeSonglistBands(bands, { firstBandIds: ["c", "b"] });
    expect(arranged.map((b) => b._id)).toEqual(["b", "c", "a"]);
    expect(arranged.map((b) => b.isFirst)).toEqual([true, true, false]);
  });

  it("puts a custom song's own band above the given bands", () => {
    const arranged = arrangeSonglistBands(bands, {
      songBandId: "c",
      firstBandIds: ["b"],
    });
    expect(arranged.map((b) => b._id)).toEqual(["c", "b", "a"]);
    expect(arranged.map((b) => b.isSongBand)).toEqual([true, false, false]);
  });

  it("keeps a custom song out of its own band's covers", () => {
    expect(summary(arrangeSonglistBands(bands, { songBandId: "a" }))).toEqual([
      ["a", false, ["a1", "a2"]],
      ["b", true, []],
      ["c", true, ["c1"]],
    ]);
  });

  it("drops a band with nothing left to offer", () => {
    expect(
      summary(
        arrangeSonglistBands(bands, {
          onlyBandId: "b",
          songBandId: "b",
        }),
      ),
    ).toEqual([]);
  });

  it("leaves out the list being shown", () => {
    expect(
      summary(
        arrangeSonglistBands(bands, {
          onlyBandId: "a",
          excludeSetlistId: "a2",
          excludeCoversBandId: "a",
        }),
      ),
    ).toEqual([["a", false, ["a1"]]]);
  });
});

describe("coverToSetlistSong", () => {
  it("keeps another band's custom song custom", () => {
    expect(
      coverToSetlistSong({
        _id: "c",
        songId: "abc",
        title: "Theirs",
        artist: "Other Band",
        duration: 60,
        isCustom: true,
        songBandId: "b",
      }),
    ).toMatchObject({ id: "abc", isCustom: true, bandId: "b" });
  });
});

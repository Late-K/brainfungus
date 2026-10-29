// utility functions for setlist

import {
  BandCover,
  Setlist,
  LearntMap,
  ProfileLearntSong,
  Song,
  UserSonglistBand,
} from "@/app/types";

// convert a Song to the minimal format needed for storing in setlist
export function toSetlistSong(song: Song): Partial<Song> {
  if (song.isCustom) {
    return { id: String(song.id ?? ""), isCustom: true };
  }
  return {
    id: String(song.id ?? ""),
    title: song.title,
    artist: song.artist,
    album: song.album,
    duration: song.duration,
    preview: song.preview,
    image: song.image,
    isCover: song.isCover,
  };
}

// one of a band's covers, as a setlist song. another band's custom song stays
// a custom song, so setlists keep getting its latest details
export function coverToSetlistSong(cover: BandCover): Song {
  if (cover.isCustom) {
    return {
      id: cover.songId,
      title: cover.title,
      artist: cover.artist,
      album: cover.album,
      duration: cover.duration ?? 0,
      image: cover.image,
      isCustom: true,
      bandId: cover.songBandId,
    };
  }
  return {
    id: cover.songId,
    title: cover.title,
    artist: cover.artist,
    album: cover.album,
    duration: cover.duration ?? 0,
    preview: cover.preview,
    image: cover.image,
    isCover: true,
  };
}

// a song from the user's own learnt or learning list, as a setlist song.
// songId is the real song id - id is the list entry's.
// another band's custom song shows that band as its artist
export function profileSongToSetlistSong(song: ProfileLearntSong): Song {
  return {
    id: song.songId,
    title: song.title,
    artist: song.isCustom ? song.bandName : song.artist,
    album: song.album,
    duration: song.duration ?? 0,
    preview: song.isCustom ? undefined : song.preview,
    image: song.image,
    isCustom: song.isCustom,
    bandId: song.isCustom ? song.bandId : undefined,
  };
}

// whether one of the user's songs can be added to a band's setlist from their
// own lists. the band's own custom songs are already in its song picker, and
// other bands' private ones can't be added
export function canAddProfileSong(song: ProfileLearntSong, bandId: string) {
  return !song.isCustom || (song.bandId !== bandId && !song.isPrivate);
}

// a private band's custom songs can only go in that band's setlists - its id,
// or undefined when a profile song can go in any band's
export function privateSongBandId(song: ProfileLearntSong) {
  return song.isCustom && song.isPrivate ? song.bandId : undefined;
}

// the user's bands for the + Songlist menu, keeping the server's order (bands
// by name, active setlist first) but with a custom song's own band (songBandId)
// on top, then firstBandIds - the band being looked at, or the bands the user
// shares with the person whose profile it is. each band offers its covers and
// setlists, except:
// - onlyBandId limits it to that band, for a private band's custom songs
// - a custom song (from songBandId) can't be its own band's cover
// - excludeSetlistId and excludeCoversBandId leave out the list being shown
// bands left with nothing to offer are dropped
export function arrangeSonglistBands(
  bands: UserSonglistBand[],
  {
    firstBandIds = [],
    onlyBandId,
    songBandId,
    excludeSetlistId,
    excludeCoversBandId,
  }: {
    firstBandIds?: string[];
    onlyBandId?: string;
    songBandId?: string;
    excludeSetlistId?: string;
    excludeCoversBandId?: string;
  },
) {
  const arranged = bands
    .filter((band) => !onlyBandId || band._id === onlyBandId)
    .map((band) => ({
      ...band,
      isSongBand: band._id === songBandId,
      isFirst: firstBandIds.includes(band._id),
      canHoldCover: band._id !== songBandId && band._id !== excludeCoversBandId,
      setlists: band.setlists.filter(
        (setlist) => setlist._id !== excludeSetlistId,
      ),
    }))
    .filter((band) => band.canHoldCover || band.setlists.length > 0);

  const rank = (band: (typeof arranged)[number]) =>
    band.isSongBand ? 0 : band.isFirst ? 1 : 2;
  // sort is stable, so each group keeps the server's order
  return arranged.sort((a, b) => rank(a) - rank(b));
}

// format seconds into mm:ss
// custom songs without audio have no duration, so treat missing values as 0
export function formatDuration(seconds: number | undefined): string {
  const whole =
    typeof seconds === "number" && Number.isFinite(seconds)
      ? Math.max(0, Math.round(seconds))
      : 0;
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// calculate overall progress for a setlist based on learntMap and member count for progress bar
export function getProgress(
  setlist: Setlist,
  learntMap: LearntMap,
  memberCount: number,
): number {
  if (setlist.songs.length === 0 || memberCount === 0) return 0;
  const totalNeeded = setlist.songs.length * memberCount;
  let totalLearnt = 0;
  for (const song of setlist.songs) {
    totalLearnt += (learntMap[String(song.id)] || []).length;
  }
  return Math.round((totalLearnt / totalNeeded) * 100);
}

// check if current user has learnt a song — matched by email (unique) not display name
export function currentUserLearnt(
  songId: string,
  learntMap: LearntMap,
  userEmail: string | null | undefined,
): boolean {
  if (!userEmail) return false;
  const learners = learntMap[String(songId)] || [];
  return learners.some((l) => l.userEmail === userEmail);
}

// index file for all types used in the app

export type BandRole = "creator" | "admin" | "member";

export interface Band {
  _id: string;
  name: string;
  description: string;
  createdAt: string;
  members?: BandMember[];
}

export interface BandMember {
  id: string;
  email: string;
  name: string;
  image?: string;
  role: BandRole;
  isAdmin?: boolean;
  isCreator?: boolean;
}

export interface Song {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  duration: number;
  preview?: string;
  image?: string;
  audioUrl?: string;
  isCustom?: boolean;
  isCover?: boolean;
}

export interface BandCover {
  _id: string;
  songId: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  preview?: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeezerResult {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  preview?: string;
  image?: string;
  url?: string;
}

export type DeezerSearchType = "track" | "artist" | "album";

export interface DeezerArtist {
  id: string;
  name: string;
  image?: string;
  albumCount: number;
  fanCount: number;
}

export interface DeezerAlbum {
  id: string;
  title: string;
  artist: string;
  image?: string;
  recordType: string;
  releaseDate?: string;
  trackCount: number;
}

export interface DeezerArtistDetail {
  artist: DeezerArtist;
  topTracks: DeezerResult[];
  albums: DeezerAlbum[];
}

export interface DeezerAlbumDetail {
  album: DeezerAlbum;
  tracks: DeezerResult[];
}

export interface Setlist {
  _id: string;
  bandId: string;
  name: string;
  songs: Song[];
  isActive: boolean;
  creatorId?: string;
  createdAt: string;
  updatedAt?: string;
}

export type AvailUser = {
  userId: string;
  userName: string;
  userEmail: string;
  userImage?: string;
};

export type LearntMap = Record<string, AvailUser[]>;

export interface CustomSong {
  _id: string;
  bandId: string;
  title: string;
  notes: string;
  album?: string;
  order?: number;
  duration?: number;
  audioUrl?: string;
  createdAt?: string;
}

export interface Message {
  _id: string;
  bandId: string;
  userId: string;
  userEmail: string;
  userName: string;
  userImage?: string | null;
  message: string;
  createdAt: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  image?: string;
  alwaysAvailable?: boolean;
  learntSongsPrivate?: boolean;
  musicApp?: MusicApp | null;
}

// streaming app a user listens to full songs on
export type MusicApp = "deezer" | "spotify" | "youtubeMusic";

export type RehearsalRepeatType = "once" | "weekly" | "biweekly";

export interface Rehearsal {
  _id: string;
  bandId: string;
  createdBy: string;
  date: string;
  startTime?: string;
  endTime?: string;
  repeatType: RehearsalRepeatType;
  notes?: string;
  excludedDates?: string[];
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RehearsalAvailability {
  _id: string;
  rehearsalId: string;
  userId: string;
  available: boolean;
  alwaysAvailable?: boolean;
  occurrenceDate?: string;
}

export interface CalendarRehearsal extends Rehearsal {
  bandName?: string;
  available?: boolean;
  occurrenceAvailability?: Record<string, boolean>;
  availableUsersBase?: AvailUser[];
  availableUsersOcc?: Record<string, AvailUser[]>;
}

export type CalendarChoiceAction = "edit" | "delete";
export type CalendarEditMode = "all" | "this";

export interface ProfileLearntSong {
  id: string;
  songId: string;
  title: string;
  artist?: string;
  album?: string;
  notes?: string;
  duration?: number;
  preview?: string;
  image?: string;
  isCustom: boolean;
  bandId?: string;
  bandName?: string;
  source: "personal" | "band";
  createdAt: string;
}

export interface PublicUserProfile {
  user: {
    _id: string;
    name: string;
    image?: string;
  };
  isPrivate: boolean;
  // the viewed user's songs, empty when their profile is private
  songs: ProfileLearntSong[];
  // the current user's songs, for comparison
  mySongs: ProfileLearntSong[];
}

export type NotificationType = "rehearsals" | "chat" | "setlists";

export type NotificationPrefs = Record<NotificationType, boolean>;

// what the service worker receives and turns into a notification
export interface PushPayload {
  title: string;
  body: string;
  url: string;
  // notifications with the same tag replace each other instead of stacking
  tag?: string;
}

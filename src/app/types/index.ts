// index file for all types used in the app

export type BandRole = "creator" | "admin" | "member";

export interface Band {
  _id: string;
  name: string;
  description: string;
  createdAt: string;
  image?: string;
  // when on, the band's custom songs only show up for its own members
  customSongsPrivate?: boolean;
  members?: BandMember[];
  // people invited who haven't accepted yet
  invites?: BandInvitee[];
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

export interface BandInvitee {
  id: string;
  name: string;
  image?: string;
  invitedAt: string;
}

// an invite the current user has been sent, shown on the home page
export interface PendingInvite {
  _id: string;
  bandId: string;
  bandName: string;
  bandDescription: string;
  bandImage?: string;
  memberCount: number;
  invitedByName: string;
  createdAt: string;
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
  // the band a custom song in a setlist belongs to
  bandId?: string;
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
  // another band's custom song, and that band. its preview is the song's audio
  isCustom?: boolean;
  songBandId?: string;
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

// one of the current user's bands with the song lists a song can be added to
// from the + Songlist menu - its covers and setlists - and the ids of the
// songs already in each
export interface UserSonglistBand {
  _id: string;
  name: string;
  image?: string;
  coverSongIds: string[];
  setlists: UserSetlist[];
}

export interface UserSetlist {
  _id: string;
  name: string;
  isActive: boolean;
  songIds: string[];
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
  // the song's own image, and its album's image which shows when it has none
  image?: string;
  albumImage?: string;
  createdAt?: string;
}

export type ChatAttachmentKind = "image" | "video" | "audio" | "file";

export interface MessageAttachment {
  kind: ChatAttachmentKind;
  url: string;
  name: string;
  size: number;
  mimeType: string;
  // voice notes and audio files
  duration?: number;
  // images and videos, so the chat doesn't jump about while they load
  width?: number;
  height?: number;
}

export interface MessageReaction {
  emoji: string;
  userIds: string[];
  userNames: string[];
}

// a gif from giphy. url is the mp4 shown in the chat, previewUrl the small
// animated webp shown in the picker
export interface ChatGif {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
}

export interface GifSearchResponse {
  gifs: ChatGif[];
  // offset of the next page, or null when there are no more
  nextOffset: number | null;
}

export interface MessageReplyPreview {
  _id: string;
  userName: string;
  message: string;
  attachmentKind?: ChatAttachmentKind | "gif";
  deleted?: boolean;
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
  editedAt?: string | null;
  deleted?: boolean;
  replyTo?: MessageReplyPreview | null;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  mentions?: ChatMention[];
  gif?: ChatGif | null;
}

// someone @mentioned in a message. userId is "everyone" for @everyone, and
// name is how it was written in the message
export interface ChatMention {
  userId: string;
  name: string;
}

// a band member who can be @mentioned
export interface ChatMember {
  userId: string;
  name: string;
  image?: string | null;
}

export interface ChatTypingUser {
  userId: string;
  userName: string;
}

export interface ChatMessagesResponse {
  messages: Message[];
  currentUserId: string;
  // server time the next poll should ask for changes since
  syncedAt: string;
  hasMore?: boolean;
  typing?: ChatTypingUser[];
  // only on the first page, for @mention suggestions
  members?: ChatMember[];
}

// another user as listed in pickers and search - never includes their email
export interface User {
  _id: string;
  name: string;
  image?: string;
  learntSongsPrivate?: boolean;
  musicApp?: MusicApp | null;
}

// the privacy toggles on the user's own profile, all off by default
export type PrivacySetting =
  | "availabilityPrivate"
  | "learntSongsPrivate"
  | "learningSongsPrivate";
export type PrivacySettings = Record<PrivacySetting, boolean>;

// the current user's own name and picture, as shown and edited on their profile
export interface OwnProfile {
  name: string;
  email: string;
  image?: string;
  // what google calls them, to switch back to
  googleName?: string;
  hasCustomName: boolean;
  hasCustomImage: boolean;
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

// a rehearsal with everyone's answers. "base" answers are for one-off
// rehearsals, "occ" ones are per date of a repeating one. available and
// occurrenceAvailability are the current user's own answers, missing when they
// haven't given one
export interface CalendarRehearsal extends Rehearsal {
  bandName?: string;
  available?: boolean;
  occurrenceAvailability?: Record<string, boolean>;
  availableUsersBase?: AvailUser[];
  availableUsersOcc?: Record<string, AvailUser[]>;
  unavailableUserIdsBase?: string[];
  unavailableUserIdsOcc?: Record<string, string[]>;
}

// the date, repeat, cancelled dates and end shared by rehearsals and day
// availability
export type RepeatSchedule = Pick<
  Rehearsal,
  "date" | "repeatType" | "excludedDates" | "endDate"
>;

// a day (or repeating day) a user has said they're free for one of their bands
export interface DayAvailability extends RepeatSchedule {
  _id: string;
  bandId: string;
}

export interface DayAvailabilityUser extends AvailUser {
  schedules: DayAvailability[];
  // only ever set on the current user, when they've made theirs private -
  // they still see their own days but aren't auto marked available
  paused?: boolean;
}

export interface DayAvailabilityInfo {
  // the current user and any bandmates who haven't made theirs private
  users: DayAvailabilityUser[];
  // member ids of each band the current user is in
  bandMemberIds: Record<string, string[]>;
}

// "this" removes just the one date, "future" that date and every one after it
export type DayAvailabilityRemoveScope = "this" | "future";

export type CalendarChoiceAction = "edit" | "delete" | "calendar";
export type CalendarEditMode = "all" | "this";

// a song on the user's profile is either learnt or still being learnt
export type ProfileSongList = "learnt" | "learning";

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
  // custom songs whose band keeps them private
  isPrivate?: boolean;
  source: "personal" | "band";
  createdAt: string;
}

export interface PublicUserProfile {
  user: {
    _id: string;
    name: string;
    image?: string;
  };
  isLearntPrivate: boolean;
  isLearningPrivate: boolean;
  // the viewed user's learnt and learning songs, each empty when kept private
  songs: ProfileLearntSong[];
  learningSongs: ProfileLearntSong[];
  // the current user's songs, for comparison
  mySongs: ProfileLearntSong[];
  // songs the current user is learning, for their Learning buttons
  myLearningSongIds: string[];
  // bands the current user can invite the viewed user to
  inviteBands: ProfileInviteBand[];
  // bands both users are in, shown first when adding their songs to a setlist
  sharedBandIds: string[];
}

export interface ProfileInviteBand {
  _id: string;
  name: string;
  status: "member" | "invited" | "none";
}

export type NotificationType =
  "rehearsals" | "chat" | "mentions" | "setlists" | "invites";

export type NotificationPrefs = Record<NotificationType, boolean>;

// what the service worker receives and turns into a notification
export interface PushPayload {
  title: string;
  body: string;
  url: string;
  // notifications with the same tag replace each other instead of stacking
  tag?: string;
}

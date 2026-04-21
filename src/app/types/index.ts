// index file for all types used in the app

export interface Band {
  _id: string;
  name: string;
  description: string;
  creatorId: string;
  adminIds: string[];
  memberIds: string[];
  createdAt: string;
  members?: BandMember[];
}

export interface BandMember {
  id: string;
  email: string;
  name: string;
  image?: string;
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

export interface Setlist {
  _id: string;
  bandId?: string;
  name: string;
  songs: Song[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type LearntMap = Record<string, AvailUser[]>;

export interface CustomSong {
  _id: string;
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
}

export type AvailUser = {
  userId: string;
  userName: string;
  userImage?: string;
};

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

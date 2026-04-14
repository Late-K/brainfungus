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
  isCustom?: boolean;
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

export type LearntMap = Record<
  string,
  { userId: string; userName: string; userImage?: string }[]
>;

export interface CustomSong {
  _id: string;
  title: string;
  notes: string;
  album?: string;
  order?: number;
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
}

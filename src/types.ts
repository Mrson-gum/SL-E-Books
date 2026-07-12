export interface Part {
  id: string;
  title: string;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  partId?: string; // Optional: reference to a part
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  genre: string;
  coverType: 'gradient' | 'image';
  coverUrl?: string;
  coverGradientIndex: number; // Index to direct to a pre-set lovely CSS gradient
  chapters: Chapter[];
  createdAt: string;
  custom?: boolean; // To distinguish user-created books from default ones
  ownerId?: string;
  ownerEmail?: string;
  parts?: Part[]; // List of book parts/sections
  likesCount?: number; // Count of user likes
}

export interface UserProfile {
  userId: string;
  displayName: string;
  bio: string;
  avatarIndex?: number;
  avatarUrl?: string;
  followersCount: number;
  followingCount: number;
  createdAt: string;
}

export interface Follow {
  id: string; // followerId_followedId
  followerId: string;
  followedId: string;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderEmail: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  title: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

export interface BookLike {
  id: string; // userId_bookId
  userId: string;
  bookId: string;
  createdAt: string;
}

export interface BookRead {
  id: string; // userId_bookId
  userId: string;
  bookId: string;
  createdAt: string;
}

export type ThemeType = 'light' | 'sepia' | 'dark';
export type FontType = 'serif' | 'sans' | 'mono';
export type FontSize = 'sm' | 'base' | 'lg' | 'xl' | '2xl';

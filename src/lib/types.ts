export interface Quote {
  symbol: string;
  price: number;
  change: number;
  percentChange: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  updatedAt: number;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  logo: string;
  industry: string;
  exchange: string;
}

export interface SearchResult {
  symbol: string;
  description: string;
  type: string;
}

export type CallDirection = "UP" | "DOWN";

export interface Call {
  id: string;
  symbol: string;
  direction: CallDirection;
  entryPrice: number;
  openedAt: number;
  closedAt?: number;
  exitPrice?: number;
  // Frozen at the moment the call closed — a closed trade's contribution to your score is a
  // historical fact and shouldn't keep drifting with live, unrelated market conditions.
  scoreImpact?: number;
}

export interface PricePoint {
  t: number;
  price: number;
}

export interface PortfolioState {
  calls: Call[];
  watchlist: string[];
  createdAt: number;
}

export interface NewsArticle {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image?: string;
  datetime: number; // unix seconds
  related?: string;
}

export interface Profile {
  userId: string;
  email: string;
  isAdmin: boolean;
  displayName?: string;
  score?: number;
}

export type FeedbackValue = "like" | "dislike";
export type ArticleFeedback = Record<number, FeedbackValue>;

export type PostStatus = "published" | "pending";

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  headline: string;
  body: string;
  imageUrl?: string;
  symbol?: string;
  status: PostStatus;
  createdAt: number;
}

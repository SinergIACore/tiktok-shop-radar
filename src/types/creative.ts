/**
 * Domain types for creative (video) intelligence.
 */

export interface CreativeCreator {
  handle: string;
  displayName: string;
}

export interface CreativeMetrics {
  views: number;
  likes: number;
  comments: number;
  /** Percentage engagement rate. */
  engagementRate: number;
  /** Duration in seconds. */
  durationSeconds: number;
}

export interface CreativeAnalysis {
  hook: string;
  cta: string;
  caption: string;
  hashtags: string[];
}

export interface Creative extends CreativeMetrics {
  id: string;
  productId: string;
  thumbnail: string;
  creator: CreativeCreator;
  /** Mocked editorial analysis. Real analysis is not implemented yet. */
  analysis: CreativeAnalysis;
  publishedAt: string;
}

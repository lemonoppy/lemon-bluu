export type EligibilityReason =
  | 'word_count'
  | 'link'
  | 'word_count_and_link'
  | null;

export interface ParsedPost {
  id: string;
  username: string;
  permalink: string;
  body: string;
  wordCount: number;
  links: string[];
}

export interface EvaluatedPost extends ParsedPost {
  isOpeningPost: boolean;
  eligible: boolean;
  eligibilityReason: EligibilityReason;
  aiReview?: AiReview;
}

export type AiClassification = 'likely_human' | 'uncertain' | 'likely_ai';

export interface AiReview {
  classification: AiClassification;
  confidence: number;
  reasons: string[];
}

export interface ThreadReport {
  threadUrl: string;
  scrapedAt: string;
  qualifyingUsernames: string[];
  posts: EvaluatedPost[];
}

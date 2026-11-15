export type Difficulty = 'easy' | 'medium' | 'hard' | '';

export interface PostChallenge {
  source?: string;
  url?: string;
  difficulty?: Difficulty;
  language?: string;
}

export interface Post {
  _id?: string;
  title: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  tags: string[];
  challenge?: PostChallenge;
  published: boolean;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TagCount {
  tag: string;
  count: number;
}

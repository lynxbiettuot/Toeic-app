export type VisibilityMode = 'PRIVATE' | 'PUBLIC';

export type FlashcardSet = {
  id: number;
  owner_user_id: number | null;
  title: string;
  description: string | null;
  visibility: VisibilityMode;
  card_count: number;
  created_at: string;
  updated_at: string | null;
};

export type Flashcard = {
  id: number;
  set_id: number;
  word: string;
  word_type: string | null;
  pronunciation: string | null;
  definition: string;
  example: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string | null;
};

export type PublicFlashcardCard = {
  id: number;
  word: string;
  pronunciation: string | null;
  definition: string;
  example: string | null;
  image_url: string | null;
};

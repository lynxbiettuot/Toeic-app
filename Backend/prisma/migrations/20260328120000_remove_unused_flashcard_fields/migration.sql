-- Remove unused/write-only fields for flashcard and spaced-repetition features
ALTER TABLE `Flashcard_sets`
  DROP COLUMN `original_owner_id`,
  DROP COLUMN `updated_at`;

ALTER TABLE `Flashcards`
  DROP COLUMN `updated_at`;

ALTER TABLE `Spaced_repetition_cards`
  DROP COLUMN `last_reviewed_at`,
  DROP COLUMN `last_rating`;

ALTER TABLE `User_saved_sets`
  DROP COLUMN `saved_at`;

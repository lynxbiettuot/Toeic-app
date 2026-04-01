/*
  Warnings:

  - You are about to drop the column `imported_from_set_id` on the `flashcard_sets` table. All the data in the column will be lost.
  - You are about to drop the column `warned_at` on the `flashcard_sets` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `flashcard_sets` DROP FOREIGN KEY `Flashcard_sets_imported_from_set_id_fkey`;

-- DropIndex
DROP INDEX `Flashcard_sets_imported_from_set_id_fkey` ON `flashcard_sets`;

-- AlterTable
ALTER TABLE `flashcard_sets` DROP COLUMN `imported_from_set_id`,
    DROP COLUMN `warned_at`,
    ADD COLUMN `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `flashcards` ADD COLUMN `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `spaced_repetition_cards` ADD COLUMN `last_rating` VARCHAR(191) NULL,
    ADD COLUMN `last_reviewed_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `user_saved_sets` ADD COLUMN `saved_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

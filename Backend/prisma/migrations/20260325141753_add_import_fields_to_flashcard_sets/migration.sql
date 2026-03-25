-- AlterTable
ALTER TABLE `flashcard_sets` ADD COLUMN `imported_from_set_id` INTEGER NULL,
    ADD COLUMN `original_owner_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Flashcard_sets` ADD CONSTRAINT `Flashcard_sets_imported_from_set_id_fkey` FOREIGN KEY (`imported_from_set_id`) REFERENCES `Flashcard_sets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

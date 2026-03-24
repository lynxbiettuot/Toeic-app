-- CreateTable
CREATE TABLE `Users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `avatar_url` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `Users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Admins` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Admins_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Exam_sets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `year` INTEGER NULL,
    `type` VARCHAR(191) NOT NULL,
    `audio_url` VARCHAR(191) NULL,
    `thumbnail_url` VARCHAR(191) NULL,
    `duration_minutes` INTEGER NOT NULL DEFAULT 120,
    `total_questions` INTEGER NOT NULL DEFAULT 200,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `created_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Question_groups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `exam_set_id` INTEGER NOT NULL,
    `part_number` INTEGER NOT NULL,
    `passage_text` VARCHAR(191) NULL,
    `transcript` VARCHAR(191) NULL,
    `image_url` VARCHAR(191) NULL,
    `audio_url` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Questions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `exam_set_id` INTEGER NOT NULL,
    `part_number` INTEGER NOT NULL,
    `question_number` INTEGER NOT NULL,
    `content` VARCHAR(191) NULL,
    `transcript` VARCHAR(191) NULL,
    `image_url` VARCHAR(191) NULL,
    `audio_url` VARCHAR(191) NULL,
    `correct_answer` VARCHAR(191) NOT NULL,
    `explanation` VARCHAR(191) NULL,
    `group_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Answer_options` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `question_id` INTEGER NOT NULL,
    `option_label` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Answer_options_question_id_option_label_key`(`question_id`, `option_label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Test_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `exam_set_id` INTEGER NOT NULL,
    `started_at` DATETIME(3) NOT NULL,
    `submitted_at` DATETIME(3) NULL,
    `listening_score` INTEGER NULL,
    `reading_score` INTEGER NULL,
    `total_score` INTEGER NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'IN_PROGRESS',
    `ai_overall_feedback` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session_part_scores` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `session_id` INTEGER NOT NULL,
    `part_number` INTEGER NOT NULL,
    `correct_count` INTEGER NULL,
    `total_questions` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User_answers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `session_id` INTEGER NOT NULL,
    `question_id` INTEGER NOT NULL,
    `selected_option` VARCHAR(191) NULL,
    `is_correct` BOOLEAN NULL,
    `is_marked` BOOLEAN NOT NULL DEFAULT false,
    `is_understood` BOOLEAN NOT NULL DEFAULT false,
    `ai_explanation` VARCHAR(191) NULL,
    `answered_at` DATETIME(3) NULL,

    UNIQUE INDEX `User_answers_session_id_question_id_key`(`session_id`, `question_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Flashcard_sets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `owner_user_id` INTEGER NULL,
    `owner_admin_id` INTEGER NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `cover_image_url` VARCHAR(191) NULL,
    `visibility` VARCHAR(191) NOT NULL DEFAULT 'PRIVATE',
    `is_system` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `card_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Flashcards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `set_id` INTEGER NOT NULL,
    `word` VARCHAR(191) NOT NULL,
    `word_type` VARCHAR(191) NULL,
    `pronunciation` VARCHAR(191) NULL,
    `definition` VARCHAR(191) NOT NULL,
    `example` VARCHAR(191) NULL,
    `image_url` VARCHAR(191) NULL,
    `audio_url` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Spaced_repetition_cards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `flashcard_id` INTEGER NOT NULL,
    `ease_factor` DOUBLE NOT NULL DEFAULT 2.5,
    `interval_days` INTEGER NOT NULL DEFAULT 1,
    `repetitions` INTEGER NOT NULL DEFAULT 0,
    `next_review_at` DATETIME(3) NULL,
    `last_reviewed_at` DATETIME(3) NULL,
    `last_rating` VARCHAR(191) NULL,

    UNIQUE INDEX `Spaced_repetition_cards_user_id_flashcard_id_key`(`user_id`, `flashcard_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Flashcard_review_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `flashcard_id` INTEGER NOT NULL,
    `rating` VARCHAR(191) NULL,
    `reviewed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User_saved_sets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `set_id` INTEGER NOT NULL,
    `saved_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_saved_sets_user_id_set_id_key`(`user_id`, `set_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Refresh_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Refresh_tokens_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Exam_sets` ADD CONSTRAINT `Exam_sets_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `Admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Question_groups` ADD CONSTRAINT `Question_groups_exam_set_id_fkey` FOREIGN KEY (`exam_set_id`) REFERENCES `Exam_sets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Questions` ADD CONSTRAINT `Questions_exam_set_id_fkey` FOREIGN KEY (`exam_set_id`) REFERENCES `Exam_sets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Questions` ADD CONSTRAINT `Questions_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `Question_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Answer_options` ADD CONSTRAINT `Answer_options_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `Questions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Test_sessions` ADD CONSTRAINT `Test_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Test_sessions` ADD CONSTRAINT `Test_sessions_exam_set_id_fkey` FOREIGN KEY (`exam_set_id`) REFERENCES `Exam_sets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session_part_scores` ADD CONSTRAINT `Session_part_scores_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `Test_sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User_answers` ADD CONSTRAINT `User_answers_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `Test_sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User_answers` ADD CONSTRAINT `User_answers_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `Questions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Flashcard_sets` ADD CONSTRAINT `Flashcard_sets_owner_user_id_fkey` FOREIGN KEY (`owner_user_id`) REFERENCES `Users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Flashcard_sets` ADD CONSTRAINT `Flashcard_sets_owner_admin_id_fkey` FOREIGN KEY (`owner_admin_id`) REFERENCES `Admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Flashcards` ADD CONSTRAINT `Flashcards_set_id_fkey` FOREIGN KEY (`set_id`) REFERENCES `Flashcard_sets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Spaced_repetition_cards` ADD CONSTRAINT `Spaced_repetition_cards_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Spaced_repetition_cards` ADD CONSTRAINT `Spaced_repetition_cards_flashcard_id_fkey` FOREIGN KEY (`flashcard_id`) REFERENCES `Flashcards`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Flashcard_review_logs` ADD CONSTRAINT `Flashcard_review_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Flashcard_review_logs` ADD CONSTRAINT `Flashcard_review_logs_flashcard_id_fkey` FOREIGN KEY (`flashcard_id`) REFERENCES `Flashcards`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User_saved_sets` ADD CONSTRAINT `User_saved_sets_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User_saved_sets` ADD CONSTRAINT `User_saved_sets_set_id_fkey` FOREIGN KEY (`set_id`) REFERENCES `Flashcard_sets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Refresh_tokens` ADD CONSTRAINT `Refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

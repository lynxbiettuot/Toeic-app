-- AlterTable
ALTER TABLE `admins` ADD COLUMN `otp_expiry` DATETIME(3) NULL,
    ADD COLUMN `reset_otp` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `otp_expiry` DATETIME(3) NULL,
    ADD COLUMN `reset_otp` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Admin_refresh_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `admin_id` INTEGER NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Admin_refresh_tokens_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Admin_refresh_tokens` ADD CONSTRAINT `Admin_refresh_tokens_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `Admins`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

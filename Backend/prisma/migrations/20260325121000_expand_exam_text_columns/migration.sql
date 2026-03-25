ALTER TABLE `Question_groups`
  MODIFY `passage_text` LONGTEXT NULL,
  MODIFY `transcript` LONGTEXT NULL,
  MODIFY `image_url` TEXT NULL,
  MODIFY `audio_url` TEXT NULL;

ALTER TABLE `Questions`
  MODIFY `content` LONGTEXT NULL,
  MODIFY `transcript` LONGTEXT NULL,
  MODIFY `image_url` TEXT NULL,
  MODIFY `audio_url` TEXT NULL,
  MODIFY `explanation` LONGTEXT NULL;

ALTER TABLE `Answer_options`
  MODIFY `content` LONGTEXT NOT NULL;

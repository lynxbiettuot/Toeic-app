ALTER TABLE `Refresh_tokens`
    MODIFY `token` VARCHAR(512) NOT NULL;

ALTER TABLE `Admin_refresh_tokens`
    MODIFY `token` VARCHAR(512) NOT NULL;

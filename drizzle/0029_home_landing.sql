ALTER TABLE `site_settings` MODIFY COLUMN `home_visitor` enum('coming_soon','matchday','journal','club','landing') NOT NULL DEFAULT 'coming_soon';--> statement-breakpoint
UPDATE `site_settings` SET `home_visitor` = 'landing' WHERE `home_visitor` IN ('matchday','journal','club');--> statement-breakpoint
ALTER TABLE `site_settings` MODIFY COLUMN `home_visitor` enum('coming_soon','landing') NOT NULL DEFAULT 'coming_soon';

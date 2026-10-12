ALTER TABLE `matches` ADD `external_id` int;--> statement-breakpoint
ALTER TABLE `matches` ADD `season` int;--> statement-breakpoint
ALTER TABLE `matches` ADD `opponent_logo` varchar(255);--> statement-breakpoint
ALTER TABLE `matches` ADD `competition_logo` varchar(255);--> statement-breakpoint
ALTER TABLE `matches` ADD `round` varchar(80);--> statement-breakpoint
ALTER TABLE `matches` ADD `city` varchar(120);--> statement-breakpoint
ALTER TABLE `matches` ADD `referee` varchar(120);--> statement-breakpoint
ALTER TABLE `matches` ADD `regulation_psg_score` int;--> statement-breakpoint
ALTER TABLE `matches` ADD `regulation_opponent_score` int;--> statement-breakpoint
ALTER TABLE `matches` ADD `penalty_psg_score` int;--> statement-breakpoint
ALTER TABLE `matches` ADD `penalty_opponent_score` int;--> statement-breakpoint
ALTER TABLE `matches` ADD `status_detail` varchar(8);--> statement-breakpoint
ALTER TABLE `matches` ADD `elapsed` int;--> statement-breakpoint
ALTER TABLE `matches` ADD `timeline` json;--> statement-breakpoint
ALTER TABLE `matches` ADD `synced_at` datetime(3);--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT `matches_external_id_unique` UNIQUE(`external_id`);--> statement-breakpoint
CREATE INDEX `matches_season_idx` ON `matches` (`season`);--> statement-breakpoint
CREATE INDEX `predictions_member_idx` ON `predictions` (`member_id`);
ALTER TABLE `members` ADD `birth_date` date;--> statement-breakpoint
ALTER TABLE `members` ADD `interests` json;--> statement-breakpoint
ALTER TABLE `members` ADD `psg_ticketing` enum('season_ticket','myparis_premium','myparis','none');--> statement-breakpoint
ALTER TABLE `members` ADD `photo_consent` boolean;--> statement-breakpoint
ALTER TABLE `members` ADD `photo_consent_at` datetime(3);
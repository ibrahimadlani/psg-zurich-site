CREATE TABLE `avatars` (
	`user_id` varchar(36) NOT NULL,
	`data` mediumblob NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `avatars_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `matches` ADD `reminder_sent_at` datetime(3);--> statement-breakpoint
ALTER TABLE `members` ADD `nickname` varchar(32);--> statement-breakpoint
ALTER TABLE `members` ADD `hide_from_leaderboard` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `notify_events` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `notify_prediction_reminders` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD CONSTRAINT `members_nickname_unique` UNIQUE(`nickname`);--> statement-breakpoint
ALTER TABLE `avatars` ADD CONSTRAINT `avatars_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;
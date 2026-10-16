ALTER TABLE `members` ADD `notifications_cleared_at` datetime(3);--> statement-breakpoint
ALTER TABLE `members` ADD `notifications_dismissed` json;
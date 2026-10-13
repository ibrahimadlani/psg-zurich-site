ALTER TABLE `events` ADD `address` varchar(255);--> statement-breakpoint
ALTER TABLE `events` ADD `place_id` varchar(255);--> statement-breakpoint
ALTER TABLE `events` ADD `latitude` double;--> statement-breakpoint
ALTER TABLE `events` ADD `longitude` double;--> statement-breakpoint
ALTER TABLE `members` ADD `address` varchar(255);--> statement-breakpoint
ALTER TABLE `members` ADD `postcode` varchar(10);
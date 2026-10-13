ALTER TABLE `attendance` ADD `checked_in_at` datetime(3);--> statement-breakpoint
ALTER TABLE `members` ADD `card_token` varchar(32);--> statement-breakpoint
ALTER TABLE `members` ADD CONSTRAINT `members_card_token_unique` UNIQUE(`card_token`);
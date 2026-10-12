CREATE TABLE `media` (
	`id` varchar(36) NOT NULL,
	`data` mediumblob NOT NULL,
	`content_type` varchar(32) NOT NULL,
	`width` int NOT NULL,
	`height` int NOT NULL,
	`uploaded_by` varchar(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `posts` ADD `category` enum('club','trips','events') DEFAULT 'club' NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `translation_group` varchar(36);--> statement-breakpoint
ALTER TABLE `posts` ADD `byline` varchar(80);--> statement-breakpoint
ALTER TABLE `media` ADD CONSTRAINT `media_uploaded_by_user_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `posts_translation_idx` ON `posts` (`translation_group`);
CREATE TABLE `site_settings` (
	`id` int NOT NULL,
	`home_visitor` enum('coming_soon','matchday','journal','club') NOT NULL DEFAULT 'coming_soon',
	`home_member` enum('dashboard','feed','matchday') NOT NULL DEFAULT 'dashboard',
	`updated_by_id` varchar(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `site_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `site_settings` ADD CONSTRAINT `site_settings_updated_by_id_user_id_fk` FOREIGN KEY (`updated_by_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;
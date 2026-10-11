CREATE TABLE `announcements` (
	`id` varchar(36) NOT NULL,
	`tone` enum('info','maintenance','urgent') NOT NULL DEFAULT 'info',
	`title_fr` varchar(80) NOT NULL,
	`title_en` varchar(80),
	`title_de` varchar(80),
	`message_fr` varchar(240) NOT NULL,
	`message_en` varchar(240),
	`message_de` varchar(240),
	`link_url` varchar(512),
	`active` boolean NOT NULL DEFAULT false,
	`ends_at` datetime,
	`created_by_id` varchar(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `announcements` ADD CONSTRAINT `announcements_created_by_id_user_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `announcements_active_idx` ON `announcements` (`active`,`updated_at`);--> statement-breakpoint
INSERT INTO `announcements` (`id`, `tone`, `title_fr`, `title_en`, `title_de`, `message_fr`, `message_en`, `message_de`, `active`) VALUES (UUID(), 'maintenance', 'Site en maintenance', 'Site under maintenance', 'Wartungsarbeiten', 'Nous préparons le nouveau site de l''association : certaines pages ne sont pas encore disponibles.', 'We are preparing the club''s new website: some pages are not available yet.', 'Wir bereiten die neue Website des Vereins vor: Einige Seiten sind noch nicht verfügbar.', true);

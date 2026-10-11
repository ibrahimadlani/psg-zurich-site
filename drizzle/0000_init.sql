CREATE TABLE `account` (
	`id` varchar(36) NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` datetime(3),
	`refresh_token_expires_at` datetime(3),
	`scope` text,
	`password` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `account_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attendance` (
	`id` varchar(36) NOT NULL,
	`event_id` varchar(36) NOT NULL,
	`member_id` varchar(36) NOT NULL,
	`status` enum('registered','waitlisted','cancelled','attended') NOT NULL DEFAULT 'registered',
	`payment_status` enum('not_required','pending','paid','refunded') NOT NULL DEFAULT 'not_required',
	`paid_at` datetime,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `attendance_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_event_member_uq` UNIQUE(`event_id`,`member_id`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` varchar(36) NOT NULL,
	`actor_id` varchar(36),
	`action` varchar(100) NOT NULL,
	`entity_type` varchar(60) NOT NULL,
	`entity_id` varchar(36),
	`metadata` json,
	`ip_address` varchar(45),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` varchar(36) NOT NULL,
	`title` varchar(200) NOT NULL,
	`file_path` varchar(512) NOT NULL,
	`mime_type` varchar(127) NOT NULL,
	`size_bytes` int unsigned NOT NULL,
	`visibility` enum('public','members','admins') NOT NULL DEFAULT 'members',
	`category` varchar(80),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` varchar(36) NOT NULL,
	`type` enum('watch_party','away_trip','members_match','social','other') NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`match_id` varchar(36),
	`location` varchar(255),
	`starts_at` datetime NOT NULL,
	`ends_at` datetime,
	`capacity` int,
	`price_cents` int NOT NULL DEFAULT 0,
	`members_only` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` varchar(36) NOT NULL,
	`opponent` varchar(120) NOT NULL,
	`competition` varchar(120) NOT NULL,
	`kickoff_at` datetime NOT NULL,
	`venue` enum('home','away','neutral') NOT NULL,
	`stadium` varchar(160),
	`psg_score` int,
	`opponent_score` int,
	`status` enum('scheduled','live','finished','postponed','cancelled') NOT NULL DEFAULT 'scheduled',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100) NOT NULL,
	`phone` varchar(32),
	`city` varchar(100),
	`member_number` varchar(20),
	`status` enum('pending','active','expired','suspended') NOT NULL DEFAULT 'pending',
	`joined_on` date,
	`expires_on` date,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `members_id` PRIMARY KEY(`id`),
	CONSTRAINT `members_user_id_unique` UNIQUE(`user_id`),
	CONSTRAINT `members_member_number_unique` UNIQUE(`member_number`)
);
--> statement-breakpoint
CREATE TABLE `poll_options` (
	`id` varchar(36) NOT NULL,
	`poll_id` varchar(36) NOT NULL,
	`label` varchar(255) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `poll_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `poll_votes` (
	`id` varchar(36) NOT NULL,
	`poll_id` varchar(36) NOT NULL,
	`option_id` varchar(36) NOT NULL,
	`member_id` varchar(36) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `poll_votes_id` PRIMARY KEY(`id`),
	CONSTRAINT `poll_votes_poll_member_uq` UNIQUE(`poll_id`,`member_id`)
);
--> statement-breakpoint
CREATE TABLE `polls` (
	`id` varchar(36) NOT NULL,
	`question` varchar(255) NOT NULL,
	`description` text,
	`status` enum('draft','open','closed') NOT NULL DEFAULT 'draft',
	`opens_at` datetime,
	`closes_at` datetime,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `polls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`locale` enum('fr','de') NOT NULL DEFAULT 'fr',
	`title` varchar(255) NOT NULL,
	`excerpt` varchar(500),
	`content` mediumtext NOT NULL,
	`image_url` varchar(512),
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`published_at` datetime,
	`author_id` varchar(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `posts_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `predictions` (
	`id` varchar(36) NOT NULL,
	`match_id` varchar(36) NOT NULL,
	`member_id` varchar(36) NOT NULL,
	`psg_score` int NOT NULL,
	`opponent_score` int NOT NULL,
	`points` int,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `predictions_id` PRIMARY KEY(`id`),
	CONSTRAINT `predictions_match_member_uq` UNIQUE(`match_id`,`member_id`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` varchar(36) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`token` varchar(255) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` varchar(36) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `session_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `subscribers` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`locale` enum('fr','de') NOT NULL DEFAULT 'fr',
	`status` enum('pending','confirmed','unsubscribed') NOT NULL DEFAULT 'pending',
	`confirmation_token` varchar(64),
	`consented_at` datetime,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `subscribers_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscribers_email_unique` UNIQUE(`email`),
	CONSTRAINT `subscribers_confirmation_token_unique` UNIQUE(`confirmation_token`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`image` text,
	`role` enum('member','admin','superadmin') NOT NULL DEFAULT 'member',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `account` ADD CONSTRAINT `account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_event_id_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_member_id_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_actor_id_user_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `events` ADD CONSTRAINT `events_match_id_matches_id_fk` FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `members` ADD CONSTRAINT `members_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `poll_options` ADD CONSTRAINT `poll_options_poll_id_polls_id_fk` FOREIGN KEY (`poll_id`) REFERENCES `polls`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `poll_votes` ADD CONSTRAINT `poll_votes_poll_id_polls_id_fk` FOREIGN KEY (`poll_id`) REFERENCES `polls`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `poll_votes` ADD CONSTRAINT `poll_votes_option_id_poll_options_id_fk` FOREIGN KEY (`option_id`) REFERENCES `poll_options`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `poll_votes` ADD CONSTRAINT `poll_votes_member_id_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `posts` ADD CONSTRAINT `posts_author_id_user_id_fk` FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `predictions` ADD CONSTRAINT `predictions_match_id_matches_id_fk` FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `predictions` ADD CONSTRAINT `predictions_member_id_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `audit_log_entity_idx` ON `audit_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_log_actor_idx` ON `audit_log` (`actor_id`);--> statement-breakpoint
CREATE INDEX `audit_log_created_at_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `documents_visibility_idx` ON `documents` (`visibility`);--> statement-breakpoint
CREATE INDEX `events_starts_at_idx` ON `events` (`starts_at`);--> statement-breakpoint
CREATE INDEX `matches_kickoff_idx` ON `matches` (`kickoff_at`);--> statement-breakpoint
CREATE INDEX `members_status_idx` ON `members` (`status`);--> statement-breakpoint
CREATE INDEX `poll_options_poll_idx` ON `poll_options` (`poll_id`);--> statement-breakpoint
CREATE INDEX `posts_listing_idx` ON `posts` (`status`,`locale`,`published_at`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);
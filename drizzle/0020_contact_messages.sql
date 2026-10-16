CREATE TABLE `contact_messages` (
	`id` varchar(36) NOT NULL,
	`thread_id` varchar(36) NOT NULL,
	`author` enum('contact','committee','note') NOT NULL,
	`author_user_id` varchar(36),
	`body` text NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `contact_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contact_threads` (
	`id` varchar(36) NOT NULL,
	`reference` int NOT NULL,
	`topic` enum('join','events','fees','partnership','website','account','other') NOT NULL,
	`status` enum('new','open','answered','closed','spam') NOT NULL DEFAULT 'new',
	`member_id` varchar(36),
	`name` varchar(120) NOT NULL,
	`email` varchar(255) NOT NULL,
	`locale` enum('fr','de','en') NOT NULL DEFAULT 'fr',
	`organisation` varchar(160),
	`context` json,
	`assigned_to_id` varchar(36),
	`tracking_token_hash` varchar(64),
	`last_message_at` datetime(3) NOT NULL,
	`first_reply_at` datetime(3),
	`reminded_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `contact_threads_id` PRIMARY KEY(`id`),
	CONSTRAINT `contact_threads_reference_unique` UNIQUE(`reference`),
	CONSTRAINT `contact_threads_tracking_token_hash_unique` UNIQUE(`tracking_token_hash`)
);
--> statement-breakpoint
ALTER TABLE `members` ADD `committee_title` varchar(60);--> statement-breakpoint
ALTER TABLE `contact_messages` ADD CONSTRAINT `contact_messages_thread_id_contact_threads_id_fk` FOREIGN KEY (`thread_id`) REFERENCES `contact_threads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contact_messages` ADD CONSTRAINT `contact_messages_author_user_id_user_id_fk` FOREIGN KEY (`author_user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contact_threads` ADD CONSTRAINT `contact_threads_member_id_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contact_threads` ADD CONSTRAINT `contact_threads_assigned_to_id_user_id_fk` FOREIGN KEY (`assigned_to_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `contact_messages_thread_idx` ON `contact_messages` (`thread_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `contact_threads_status_idx` ON `contact_threads` (`status`,`last_message_at`);--> statement-breakpoint
CREATE INDEX `contact_threads_email_idx` ON `contact_threads` (`email`);--> statement-breakpoint
CREATE INDEX `contact_threads_member_idx` ON `contact_threads` (`member_id`);
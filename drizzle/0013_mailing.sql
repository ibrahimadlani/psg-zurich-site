CREATE TABLE `email_automations` (
	`key` varchar(64) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`delay_minutes` int NOT NULL DEFAULT 0,
	`updated_by` varchar(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `email_automations_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `email_campaigns` (
	`id` varchar(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`audience` enum('members','paid','unpaid','pending','event') NOT NULL DEFAULT 'members',
	`audience_event_id` varchar(36),
	`cta_url` varchar(255),
	`status` enum('draft','scheduled','sending','sent') NOT NULL DEFAULT 'draft',
	`scheduled_at` datetime(3),
	`sent_count` int NOT NULL DEFAULT 0,
	`created_by` varchar(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `email_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_jobs` (
	`id` varchar(36) NOT NULL,
	`automation_key` varchar(64),
	`campaign_id` varchar(36),
	`member_id` varchar(36),
	`to_email` varchar(255) NOT NULL,
	`locale` enum('fr','de','en') NOT NULL DEFAULT 'fr',
	`payload` json NOT NULL,
	`dedupe_key` varchar(191),
	`status` enum('pending','sending','sent','failed','skipped','cancelled') NOT NULL DEFAULT 'pending',
	`send_after` datetime(3) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`last_error` varchar(500),
	`sent_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `email_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_jobs_dedupe_key_unique` UNIQUE(`dedupe_key`)
);
--> statement-breakpoint
CREATE TABLE `email_templates` (
	`id` varchar(36) NOT NULL,
	`owner_type` enum('automation','campaign') NOT NULL,
	`owner_id` varchar(64) NOT NULL,
	`locale` enum('fr','de','en') NOT NULL,
	`subject` varchar(200) NOT NULL,
	`preview` varchar(200) NOT NULL,
	`heading` varchar(200) NOT NULL,
	`body` text NOT NULL,
	`cta_label` varchar(80),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `email_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_templates_owner_locale_uq` UNIQUE(`owner_type`,`owner_id`,`locale`)
);
--> statement-breakpoint
CREATE TABLE `mailing_settings` (
	`id` int NOT NULL,
	`paused` boolean NOT NULL DEFAULT false,
	`daily_cap` int NOT NULL DEFAULT 500,
	`per_minute` int NOT NULL DEFAULT 20,
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `mailing_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `members` ADD `notify_results` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `notify_news` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `last_seen_at` datetime(3);--> statement-breakpoint
ALTER TABLE `email_automations` ADD CONSTRAINT `email_automations_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_campaigns` ADD CONSTRAINT `email_campaigns_audience_event_id_events_id_fk` FOREIGN KEY (`audience_event_id`) REFERENCES `events`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_campaigns` ADD CONSTRAINT `email_campaigns_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_jobs` ADD CONSTRAINT `email_jobs_campaign_id_email_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `email_campaigns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_jobs` ADD CONSTRAINT `email_jobs_member_id_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `email_jobs_due_idx` ON `email_jobs` (`status`,`send_after`);--> statement-breakpoint
CREATE INDEX `email_jobs_automation_idx` ON `email_jobs` (`automation_key`);--> statement-breakpoint
CREATE INDEX `email_jobs_campaign_idx` ON `email_jobs` (`campaign_id`);--> statement-breakpoint
INSERT INTO `mailing_settings` (`id`) VALUES (1);
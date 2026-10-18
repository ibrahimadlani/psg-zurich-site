CREATE TABLE `analytics_events` (
	`id` varchar(36) NOT NULL,
	`at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`name` varchar(60) NOT NULL,
	`target_type` varchar(30),
	`target_id` varchar(191),
	`visitor` varchar(32) NOT NULL,
	`path` varchar(255) NOT NULL,
	`staff` boolean NOT NULL DEFAULT false,
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analytics_salts` (
	`day` varchar(10) NOT NULL,
	`salt` varchar(64) NOT NULL,
	CONSTRAINT `analytics_salts_day` PRIMARY KEY(`day`)
);
--> statement-breakpoint
CREATE TABLE `api_usage` (
	`bucket` datetime NOT NULL,
	`method` varchar(8) NOT NULL,
	`route` varchar(191) NOT NULL,
	`status_class` varchar(3) NOT NULL,
	`count` int NOT NULL,
	`total_ms` int NOT NULL,
	`max_ms` int NOT NULL,
	CONSTRAINT `api_usage_key` UNIQUE(`bucket`,`method`,`route`,`status_class`)
);
--> statement-breakpoint
CREATE TABLE `page_views` (
	`id` varchar(36) NOT NULL,
	`at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`path` varchar(255) NOT NULL,
	`locale` varchar(5) NOT NULL,
	`content_type` enum('page','article','event','match','product') NOT NULL DEFAULT 'page',
	`content_id` varchar(191),
	`visitor` varchar(32) NOT NULL,
	`signed_in` boolean NOT NULL DEFAULT false,
	`staff` boolean NOT NULL DEFAULT false,
	`entry` boolean NOT NULL DEFAULT false,
	`referrer_host` varchar(191),
	`utm_source` varchar(100),
	`device` enum('mobile','tablet','desktop') NOT NULL,
	`browser` varchar(40) NOT NULL,
	CONSTRAINT `page_views_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `analytics_events_name_idx` ON `analytics_events` (`name`,`at`);--> statement-breakpoint
CREATE INDEX `analytics_events_target_idx` ON `analytics_events` (`target_type`,`target_id`,`at`);--> statement-breakpoint
CREATE INDEX `api_usage_route_idx` ON `api_usage` (`route`,`bucket`);--> statement-breakpoint
CREATE INDEX `page_views_at_idx` ON `page_views` (`at`);--> statement-breakpoint
CREATE INDEX `page_views_content_idx` ON `page_views` (`content_type`,`content_id`,`at`);--> statement-breakpoint
CREATE INDEX `page_views_path_idx` ON `page_views` (`path`,`at`);
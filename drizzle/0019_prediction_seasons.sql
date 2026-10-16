CREATE TABLE `prediction_seasons` (
	`season` int NOT NULL,
	`closed_at` datetime(3) NOT NULL,
	CONSTRAINT `prediction_seasons_season` PRIMARY KEY(`season`)
);
--> statement-breakpoint
CREATE TABLE `prediction_standings` (
	`id` varchar(36) NOT NULL,
	`season` int NOT NULL,
	`member_id` varchar(36) NOT NULL,
	`rank` int NOT NULL,
	`points` int NOT NULL,
	`exact` int NOT NULL,
	`played` int NOT NULL,
	`reward_given_at` datetime(3),
	CONSTRAINT `prediction_standings_id` PRIMARY KEY(`id`),
	CONSTRAINT `prediction_standings_season_member_uq` UNIQUE(`season`,`member_id`)
);
--> statement-breakpoint
ALTER TABLE `prediction_standings` ADD CONSTRAINT `prediction_standings_season_prediction_seasons_season_fk` FOREIGN KEY (`season`) REFERENCES `prediction_seasons`(`season`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prediction_standings` ADD CONSTRAINT `prediction_standings_member_id_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `prediction_standings_member_idx` ON `prediction_standings` (`member_id`);
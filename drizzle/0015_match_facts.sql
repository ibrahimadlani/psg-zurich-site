ALTER TABLE `matches` ADD `opponent_external_id` int;--> statement-breakpoint
ALTER TABLE `matches` ADD `officials` json;--> statement-breakpoint
ALTER TABLE `matches` ADD `half_time_psg_score` int;--> statement-breakpoint
ALTER TABLE `matches` ADD `half_time_opponent_score` int;
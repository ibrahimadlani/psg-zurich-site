ALTER TABLE `orders` ADD `pickup_event_id` varchar(36);--> statement-breakpoint
ALTER TABLE `products` ADD `size_guide` json;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_pickup_event_id_events_id_fk` FOREIGN KEY (`pickup_event_id`) REFERENCES `events`(`id`) ON DELETE set null ON UPDATE no action;
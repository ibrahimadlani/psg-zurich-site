CREATE TABLE `route_times` (
	`key` varchar(64) NOT NULL,
	`duration_seconds` int NOT NULL,
	`distance_meters` int NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `route_times_key` PRIMARY KEY(`key`)
);

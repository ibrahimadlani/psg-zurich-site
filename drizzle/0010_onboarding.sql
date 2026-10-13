ALTER TABLE `members` ADD `onboarded_at` datetime(3);--> statement-breakpoint
-- Members who signed up before the welcome step existed are not asked again.
UPDATE `members` SET `onboarded_at` = `created_at`;
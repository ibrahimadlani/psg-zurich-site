CREATE TABLE `post_slug_history` (
	`slug` varchar(191) NOT NULL,
	`post_id` varchar(36) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `post_slug_history_slug` PRIMARY KEY(`slug`)
);
--> statement-breakpoint
ALTER TABLE `posts` MODIFY COLUMN `category` enum('club','trips','events','guides') NOT NULL DEFAULT 'club';--> statement-breakpoint
ALTER TABLE `events` ADD `city` varchar(80) DEFAULT 'Zurich' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `is_public` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `matches` ADD `broadcaster` varchar(60);--> statement-breakpoint
ALTER TABLE `matches` ADD `intro` json;--> statement-breakpoint
ALTER TABLE `posts` ADD `seo_title` varchar(70);--> statement-breakpoint
ALTER TABLE `posts` ADD `seo_description` varchar(170);--> statement-breakpoint
ALTER TABLE `site_settings` ADD `broadcasters` json;--> statement-breakpoint
ALTER TABLE `post_slug_history` ADD CONSTRAINT `post_slug_history_post_id_posts_id_fk` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT IGNORE INTO `post_slug_history` (`slug`, `post_id`) SELECT `slug`, `id` FROM `posts` WHERE `slug` IN ('regarder-psg-suisse-tv-streaming-2026-2027', 'watch-psg-in-switzerland-tv-streaming-2026-27', 'psg-schauen-schweiz-tv-streaming-2026-27');--> statement-breakpoint
UPDATE `posts` SET `slug` = 'regarder-psg-suisse-tv-streaming', `category` = 'guides' WHERE `slug` = 'regarder-psg-suisse-tv-streaming-2026-2027';--> statement-breakpoint
UPDATE `posts` SET `slug` = 'watch-psg-in-switzerland-tv-streaming', `category` = 'guides' WHERE `slug` = 'watch-psg-in-switzerland-tv-streaming-2026-27';--> statement-breakpoint
UPDATE `posts` SET `slug` = 'psg-schauen-schweiz-tv-streaming', `category` = 'guides' WHERE `slug` = 'psg-schauen-schweiz-tv-streaming-2026-27';--> statement-breakpoint
UPDATE `posts` SET `category` = 'guides' WHERE `slug` IN ('voir-psg-parc-des-princes-depuis-zurich', 'psg-parc-des-princes-from-zurich-guide', 'psg-parc-des-princes-anreise-ab-zuerich');--> statement-breakpoint
UPDATE `posts` SET `content` = REPLACE(REPLACE(REPLACE(`content`, 'regarder-psg-suisse-tv-streaming-2026-2027', 'regarder-psg-suisse-tv-streaming'), 'watch-psg-in-switzerland-tv-streaming-2026-27', 'watch-psg-in-switzerland-tv-streaming'), 'psg-schauen-schweiz-tv-streaming-2026-27', 'psg-schauen-schweiz-tv-streaming') WHERE `content` LIKE '%tv-streaming-2026-2%';--> statement-breakpoint
UPDATE `posts` SET `content` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`content`, 'Elle a prolongé ses droits jusqu''à la saison 2026-2027, qui est donc la dernière du contrat.', 'Ses droits courent jusqu''à la saison 2026-2027 et ont été renouvelés en avril 2026 pour les saisons 2027-2028 à 2030-2031.'), 'Les prix des plateformes changent souvent, et les droits de la Ligue 1 comme de la Ligue des champions en Suisse seront remis en jeu à partir de 2027.', 'Les prix des plateformes changent souvent. La Ligue des champions reste chez blue Sport jusqu''en 2031, et le contrat de DAZN pour la Ligue 1 court jusqu''en 2027.'), 'Der Rechtevertrag läuft bis und mit Saison 2026/27, es ist also die letzte Saison des Vertrags.', 'Der Vertrag läuft bis und mit Saison 2026/27 und wurde im April 2026 für die Saisons 2027/28 bis 2030/31 erneuert.'), 'Die Abopreise ändern sich häufig, und die Rechte an Ligue 1 und Champions League werden in der Schweiz ab 2027 neu vergeben.', 'Die Abopreise ändern sich häufig. Die Champions League bleibt bis 2031 bei blue Sport, der Ligue-1-Vertrag von DAZN läuft bis 2027.'), 'Its rights run up to and including 2026-27, so this is the last season of the deal.', 'Its rights run up to and including 2026-27 and were renewed in April 2026 for the seasons 2027-28 to 2030-31.'), 'Platform prices change often, and the Swiss rights to both Ligue 1 and the Champions League go back on the market from 2027.', 'Platform prices change often. The Champions League stays with blue Sport until 2031, and DAZN''s Ligue 1 deal runs until 2027.') WHERE `category` = 'guides';--> statement-breakpoint
UPDATE `posts` SET `content` = REPLACE(REPLACE(REPLACE(REPLACE(`content`, '/matchs)', '/matches)'), '/evenements)', '/events)'), '/adhesion)', '/join)'), '/actualites/', '/news/');

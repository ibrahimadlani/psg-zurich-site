-- Shorter titles for search results on the TV guides; a title the committee has set stays.
UPDATE `posts` SET `seo_title` = 'Regarder le PSG en Suisse en 2026-2027 : chaînes et prix' WHERE `slug` = 'regarder-psg-suisse-tv-streaming' AND `seo_title` IS NULL;
--> statement-breakpoint
UPDATE `posts` SET `seo_title` = 'PSG schauen in der Schweiz 2026/27: Sender und Preise' WHERE `slug` = 'psg-schauen-schweiz-tv-streaming' AND `seo_title` IS NULL;
--> statement-breakpoint
UPDATE `posts` SET `seo_title` = 'Watch PSG in Switzerland in 2026-27: channels and prices' WHERE `slug` = 'watch-psg-in-switzerland-tv-streaming' AND `seo_title` IS NULL;

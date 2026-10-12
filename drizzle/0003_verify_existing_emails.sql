-- Email confirmation becomes mandatory: accounts created before it stay usable.
UPDATE `user` SET `email_verified` = true WHERE `email_verified` = false;

-- Members accepted before the fee was tracked count as paid for the 2026/27 season.
UPDATE `members` SET `expires_on` = '2027-06-30' WHERE `status` = 'active' AND `expires_on` IS NULL;

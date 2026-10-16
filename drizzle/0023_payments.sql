CREATE TABLE `document_numbers` (
	`series` varchar(2) NOT NULL,
	`year` int NOT NULL,
	`last` int NOT NULL DEFAULT 0,
	CONSTRAINT `document_numbers_uq` UNIQUE(`series`,`year`)
);
--> statement-breakpoint
CREATE TABLE `dues_rates` (
	`season` varchar(9) NOT NULL,
	`adult_amount` int NOT NULL,
	`junior_amount` int NOT NULL,
	`set_by_id` varchar(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `dues_rates_season` PRIMARY KEY(`season`)
);
--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` varchar(36) NOT NULL,
	`date` date NOT NULL,
	`fiscal_year` varchar(9) NOT NULL,
	`account` enum('dues','shop','shipping','donations','refunds','stripe_fees','payouts') NOT NULL,
	`amount` int NOT NULL,
	`description` varchar(255) NOT NULL,
	`payment_id` varchar(36),
	`refund_id` varchar(36),
	`payout_id` varchar(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `ledger_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` varchar(36) NOT NULL,
	`payment_id` varchar(36) NOT NULL,
	`member_id` varchar(36),
	`fulfilment` enum('pickup','shipping') NOT NULL,
	`shipping_address` json,
	`status` enum('paid','ready','handed_over','shipped','canceled') NOT NULL DEFAULT 'paid',
	`tracking_number` varchar(80),
	`handed_over_at` datetime(3),
	`handed_over_by_id` varchar(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_payment_id_unique` UNIQUE(`payment_id`)
);
--> statement-breakpoint
CREATE TABLE `payment_items` (
	`id` varchar(36) NOT NULL,
	`payment_id` varchar(36) NOT NULL,
	`type` enum('dues','product','shipping','donation') NOT NULL,
	`description` varchar(255) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unit_amount` int NOT NULL,
	`total` int NOT NULL,
	`season` varchar(9),
	`variant_id` varchar(36),
	CONSTRAINT `payment_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` varchar(36) NOT NULL,
	`reference` int NOT NULL,
	`kind` enum('dues','shop','donation') NOT NULL,
	`status` enum('pending','processing','succeeded','failed','canceled','refunded','partially_refunded') NOT NULL DEFAULT 'pending',
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'CHF',
	`fee_amount` int,
	`net_amount` int,
	`refunded_amount` int NOT NULL DEFAULT 0,
	`method` enum('card','twint','apple_pay','google_pay','bank_transfer','cash','twint_manual'),
	`member_id` varchar(36),
	`payer_name` varchar(200) NOT NULL,
	`payer_email` varchar(255) NOT NULL,
	`locale` enum('fr','de','en') NOT NULL DEFAULT 'fr',
	`message` varchar(500),
	`anonymous` boolean NOT NULL DEFAULT false,
	`stripe_payment_intent_id` varchar(64),
	`stripe_charge_id` varchar(64),
	`card_brand` varchar(20),
	`card_last4` varchar(4),
	`receipt_number` varchar(20),
	`paid_at` datetime(3),
	`payout_id` varchar(36),
	`created_by_id` varchar(36),
	`note` varchar(500),
	`ip_address` varchar(45),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_reference_unique` UNIQUE(`reference`),
	CONSTRAINT `payments_stripe_payment_intent_id_unique` UNIQUE(`stripe_payment_intent_id`),
	CONSTRAINT `payments_receipt_number_unique` UNIQUE(`receipt_number`)
);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`label` varchar(40) NOT NULL,
	`sku` varchar(60),
	`stock` int NOT NULL DEFAULT 0,
	`held` int NOT NULL DEFAULT 0,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `product_variants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`name` json NOT NULL,
	`description` json NOT NULL,
	`price` int NOT NULL,
	`images` json NOT NULL,
	`active` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `receipts` (
	`number` varchar(20) NOT NULL,
	`payment_id` varchar(36),
	`refund_id` varchar(36),
	`pdf` mediumblob NOT NULL,
	`sha256` varchar(64) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `receipts_number` PRIMARY KEY(`number`)
);
--> statement-breakpoint
CREATE TABLE `refunds` (
	`id` varchar(36) NOT NULL,
	`payment_id` varchar(36) NOT NULL,
	`amount` int NOT NULL,
	`reason` varchar(500) NOT NULL,
	`status` enum('pending','succeeded','failed') NOT NULL DEFAULT 'pending',
	`credit_note_number` varchar(20),
	`stripe_refund_id` varchar(64),
	`created_by_id` varchar(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `refunds_id` PRIMARY KEY(`id`),
	CONSTRAINT `refunds_credit_note_number_unique` UNIQUE(`credit_note_number`),
	CONSTRAINT `refunds_stripe_refund_id_unique` UNIQUE(`stripe_refund_id`)
);
--> statement-breakpoint
CREATE TABLE `shop_settings` (
	`id` int NOT NULL,
	`shipping_fee` int NOT NULL DEFAULT 900,
	`shipping_enabled` boolean NOT NULL DEFAULT true,
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `shop_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_holds` (
	`id` varchar(36) NOT NULL,
	`variant_id` varchar(36) NOT NULL,
	`payment_id` varchar(36) NOT NULL,
	`quantity` int NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	CONSTRAINT `stock_holds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stripe_events` (
	`id` varchar(64) NOT NULL,
	`type` varchar(80) NOT NULL,
	`payload` json NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`processed_at` datetime(3),
	`attempts` int NOT NULL DEFAULT 0,
	`error` varchar(500),
	CONSTRAINT `stripe_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stripe_payouts` (
	`id` varchar(36) NOT NULL,
	`stripe_payout_id` varchar(64) NOT NULL,
	`amount` int NOT NULL,
	`fees` int NOT NULL DEFAULT 0,
	`arrival_date` date NOT NULL,
	`status` varchar(20) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `stripe_payouts_id` PRIMARY KEY(`id`),
	CONSTRAINT `stripe_payouts_stripe_payout_id_unique` UNIQUE(`stripe_payout_id`)
);
--> statement-breakpoint
ALTER TABLE `members` ADD `stripe_customer_id` varchar(64);--> statement-breakpoint
ALTER TABLE `members` ADD CONSTRAINT `members_stripe_customer_id_unique` UNIQUE(`stripe_customer_id`);--> statement-breakpoint
ALTER TABLE `dues_rates` ADD CONSTRAINT `dues_rates_set_by_id_user_id_fk` FOREIGN KEY (`set_by_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ledger_entries` ADD CONSTRAINT `ledger_entries_payment_id_payments_id_fk` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ledger_entries` ADD CONSTRAINT `ledger_entries_refund_id_refunds_id_fk` FOREIGN KEY (`refund_id`) REFERENCES `refunds`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_payment_id_payments_id_fk` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_member_id_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_handed_over_by_id_user_id_fk` FOREIGN KEY (`handed_over_by_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_items` ADD CONSTRAINT `payment_items_payment_id_payments_id_fk` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_member_id_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_created_by_id_user_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_payment_id_payments_id_fk` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_refund_id_refunds_id_fk` FOREIGN KEY (`refund_id`) REFERENCES `refunds`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_payment_id_payments_id_fk` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_created_by_id_user_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_holds` ADD CONSTRAINT `stock_holds_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_holds` ADD CONSTRAINT `stock_holds_payment_id_payments_id_fk` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ledger_year_idx` ON `ledger_entries` (`fiscal_year`,`date`);--> statement-breakpoint
CREATE INDEX `ledger_payment_idx` ON `ledger_entries` (`payment_id`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `orders_member_idx` ON `orders` (`member_id`);--> statement-breakpoint
CREATE INDEX `payment_items_payment_idx` ON `payment_items` (`payment_id`);--> statement-breakpoint
CREATE INDEX `payments_status_idx` ON `payments` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `payments_member_idx` ON `payments` (`member_id`);--> statement-breakpoint
CREATE INDEX `payments_kind_paid_idx` ON `payments` (`kind`,`paid_at`);--> statement-breakpoint
CREATE INDEX `product_variants_product_idx` ON `product_variants` (`product_id`);--> statement-breakpoint
CREATE INDEX `refunds_payment_idx` ON `refunds` (`payment_id`);--> statement-breakpoint
CREATE INDEX `stock_holds_payment_idx` ON `stock_holds` (`payment_id`);--> statement-breakpoint
CREATE INDEX `stock_holds_expiry_idx` ON `stock_holds` (`expires_at`);--> statement-breakpoint
CREATE INDEX `stripe_events_pending_idx` ON `stripe_events` (`processed_at`);
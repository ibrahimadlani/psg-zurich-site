CREATE TABLE `document_files` (
	`document_id` varchar(36) NOT NULL,
	`data` mediumblob NOT NULL,
	CONSTRAINT `document_files_document_id` PRIMARY KEY(`document_id`)
);
--> statement-breakpoint
ALTER TABLE `document_files` ADD CONSTRAINT `document_files_document_id_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE cascade ON UPDATE no action;
CREATE TABLE `recipes` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`ingredience` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
DROP TABLE `users`;
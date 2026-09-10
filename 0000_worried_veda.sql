CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	`name` text NOT NULL,
	`score` integer NOT NULL,
	`elapsed_ms` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_records_ranking` ON `records` (`version`,"score" desc,`elapsed_ms`,`created_at`);--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	`started_at` integer NOT NULL,
	`stage` integer DEFAULT 0 NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`finished_at` integer,
	`elapsed_ms` integer
);

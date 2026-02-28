CREATE TABLE `form_delivery_log` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`submission_id` int NOT NULL,
	`provider` varchar(60) NOT NULL DEFAULT 'resend',
	`status` varchar(40) NOT NULL,
	`error_message` varchar(512) NOT NULL DEFAULT '',
	`delivered_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `form_delivery_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `form_submissions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`form_type` varchar(80) NOT NULL,
	`name` varchar(120) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(60) NOT NULL DEFAULT '',
	`message` text NOT NULL,
	`source_path` varchar(512) NOT NULL DEFAULT '',
	`payload_json` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `form_submissions_id` PRIMARY KEY(`id`)
);

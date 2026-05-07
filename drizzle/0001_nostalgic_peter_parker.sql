CREATE TABLE `early_access_signups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`email` varchar(320) NOT NULL,
	`company` varchar(200) NOT NULL,
	`teamSize` varchar(50) NOT NULL,
	`useCase` varchar(200) NOT NULL,
	`message` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `early_access_signups_id` PRIMARY KEY(`id`)
);

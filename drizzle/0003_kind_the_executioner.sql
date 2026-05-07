CREATE TABLE `audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(36),
	`teamId` int,
	`actorId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`metadata` text,
	`prevHash` varchar(64),
	`hash` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `team_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`token` varchar(128) NOT NULL,
	`invitedByUserId` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `team_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `team_invites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','member') NOT NULL DEFAULT 'member',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `team_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`ownerId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verification_sessions` (
	`id` varchar(36) NOT NULL,
	`teamId` int,
	`initiatorId` int NOT NULL,
	`responderId` int NOT NULL,
	`wordA` varchar(64) NOT NULL,
	`wordB` varchar(64) NOT NULL,
	`actionContext` text,
	`status` enum('pending','active','verified','rejected','expired','cancelled') NOT NULL DEFAULT 'pending',
	`initiatorConfirmed` boolean NOT NULL DEFAULT false,
	`responderConfirmed` boolean NOT NULL DEFAULT false,
	`rejectionReason` varchar(200),
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `verification_sessions_id` PRIMARY KEY(`id`)
);

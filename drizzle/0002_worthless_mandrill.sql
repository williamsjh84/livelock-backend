CREATE TABLE `webauthn_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`challenge` varchar(512) NOT NULL,
	`type` enum('registration','authentication') NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webauthn_challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webauthn_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`credentialId` varchar(512) NOT NULL,
	`publicKey` text NOT NULL,
	`counter` bigint NOT NULL DEFAULT 0,
	`deviceName` varchar(100) NOT NULL DEFAULT 'My Device',
	`userVerified` boolean NOT NULL DEFAULT false,
	`authenticatorAttachment` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastUsedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webauthn_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `webauthn_credentials_credentialId_unique` UNIQUE(`credentialId`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `displayName` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `hasPasskey` boolean DEFAULT false NOT NULL;
ALTER TABLE `purchases` RENAME COLUMN "price_paid" TO "amount_paid";--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `birth_date`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `gender`;
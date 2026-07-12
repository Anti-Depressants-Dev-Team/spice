ALTER TABLE "remote_devices" ADD COLUMN IF NOT EXISTS "shuffle_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "remote_devices" ADD COLUMN IF NOT EXISTS "repeat_mode" text DEFAULT 'none' NOT NULL;

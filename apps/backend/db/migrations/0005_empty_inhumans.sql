CREATE TABLE IF NOT EXISTS "system_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"emergency_austerity" boolean DEFAULT false NOT NULL,
	"austerity_throttle_rate" integer DEFAULT 50 NOT NULL,
	"disable_sync" boolean DEFAULT false NOT NULL,
	"emergency_stop" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "playlist_members" ADD COLUMN "status" text DEFAULT 'accepted' NOT NULL;
CREATE TABLE IF NOT EXISTS "history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"profile_id" text DEFAULT 'default' NOT NULL,
	"source_id" text NOT NULL,
	"track_id" text NOT NULL,
	"title" text DEFAULT 'Track' NOT NULL,
	"artists_json" text DEFAULT '[]' NOT NULL,
	"artwork_url" text,
	"duration_ms" integer,
	"played_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ms_listened" bigint NOT NULL,
	"device_id" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "likes" (
	"user_id" uuid NOT NULL,
	"profile_id" text DEFAULT 'default' NOT NULL,
	"source_id" text NOT NULL,
	"track_id" text NOT NULL,
	"title" text DEFAULT 'Track' NOT NULL,
	"artists_json" text DEFAULT '[]' NOT NULL,
	"artwork_url" text,
	"duration_ms" integer,
	"liked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "likes_user_id_profile_id_source_id_track_id_pk" PRIMARY KEY("user_id","profile_id","source_id","track_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oauth_links" (
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_user_id" text NOT NULL,
	"refresh_token_enc" text NOT NULL,
	"scopes" text NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_links_user_id_provider_pk" PRIMARY KEY("user_id","provider")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "playlist_items" (
	"playlist_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"source_id" text NOT NULL,
	"track_id" text NOT NULL,
	"title" text DEFAULT 'Track' NOT NULL,
	"artists_json" text DEFAULT '[]' NOT NULL,
	"artwork_url" text,
	"duration_ms" integer,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "playlist_items_playlist_id_position_pk" PRIMARY KEY("playlist_id","position")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "playlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"profile_id" text DEFAULT 'default' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"gradient" text DEFAULT 'linear-gradient(135deg, #a855f7, #ec4899)' NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profiles" (
	"id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"gradient" text NOT NULL,
	"songs_played" integer DEFAULT 0 NOT NULL,
	"joined_at" text NOT NULL,
	"passcode" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "playlists" ADD COLUMN IF NOT EXISTS "gradient" text DEFAULT 'linear-gradient(135deg, #a855f7, #ec4899)' NOT NULL;
--> statement-breakpoint
ALTER TABLE "playlist_items" ADD COLUMN IF NOT EXISTS "title" text DEFAULT 'Track' NOT NULL;
--> statement-breakpoint
ALTER TABLE "playlist_items" ADD COLUMN IF NOT EXISTS "artists_json" text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE "playlist_items" ADD COLUMN IF NOT EXISTS "artwork_url" text;
--> statement-breakpoint
ALTER TABLE "playlist_items" ADD COLUMN IF NOT EXISTS "duration_ms" integer;
--> statement-breakpoint
ALTER TABLE "likes" ADD COLUMN IF NOT EXISTS "title" text DEFAULT 'Track' NOT NULL;
--> statement-breakpoint
ALTER TABLE "likes" ADD COLUMN IF NOT EXISTS "artists_json" text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE "likes" ADD COLUMN IF NOT EXISTS "artwork_url" text;
--> statement-breakpoint
ALTER TABLE "likes" ADD COLUMN IF NOT EXISTS "duration_ms" integer;
--> statement-breakpoint
ALTER TABLE "history" ADD COLUMN IF NOT EXISTS "title" text DEFAULT 'Track' NOT NULL;
--> statement-breakpoint
ALTER TABLE "history" ADD COLUMN IF NOT EXISTS "artists_json" text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE "history" ADD COLUMN IF NOT EXISTS "artwork_url" text;
--> statement-breakpoint
ALTER TABLE "history" ADD COLUMN IF NOT EXISTS "duration_ms" integer;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "history" ADD CONSTRAINT "history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oauth_links" ADD CONSTRAINT "oauth_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "playlist_items" ADD CONSTRAINT "playlist_items_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "playlists" ADD CONSTRAINT "playlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

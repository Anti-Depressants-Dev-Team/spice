CREATE TABLE IF NOT EXISTS "profile_likes" (
	"liker_user_id" uuid NOT NULL,
	"target_user_id" uuid NOT NULL,
	"liked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_likes_liker_user_id_target_user_id_pk" PRIMARY KEY("liker_user_id","target_user_id")
);
--> statement-breakpoint
ALTER TABLE "playlist_members" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'accepted' NOT NULL;--> statement-breakpoint
ALTER TABLE "playlists" ADD COLUMN "is_public" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "is_private" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profile_likes" ADD CONSTRAINT "profile_likes_liker_user_id_users_id_fk" FOREIGN KEY ("liker_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profile_likes" ADD CONSTRAINT "profile_likes_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

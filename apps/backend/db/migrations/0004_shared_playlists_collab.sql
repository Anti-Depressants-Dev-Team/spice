-- Add username column for user-to-user lookup in shared playlists
ALTER TABLE "users" ADD COLUMN "username" TEXT UNIQUE;

-- Add attribution column to track who added each song in shared playlists
ALTER TABLE "playlist_items" ADD COLUMN "added_by_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL;

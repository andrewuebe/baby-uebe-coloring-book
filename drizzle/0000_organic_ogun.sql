CREATE TABLE "entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"letter" char(1) NOT NULL,
	"artist_name" text NOT NULL,
	"subject" text NOT NULL,
	"image_url" text NOT NULL,
	"stroke_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entries_letter_unique" UNIQUE("letter")
);
--> statement-breakpoint
CREATE TABLE "letter_locks" (
	"letter" char(1) PRIMARY KEY NOT NULL,
	"lock_token" uuid NOT NULL,
	"artist_name" text,
	"subject" text,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_heartbeat_at" timestamp with time zone DEFAULT now() NOT NULL
);

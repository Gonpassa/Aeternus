CREATE TYPE "public"."primary_mood" AS ENUM('happy', 'calm', 'sad', 'anxious', 'angry');--> statement-breakpoint
CREATE TYPE "public"."specific_emotion" AS ENUM('content', 'proud', 'excited', 'grateful', 'peaceful', 'relaxed', 'relieved', 'secure', 'lonely', 'disappointed', 'hurt', 'grieving', 'nervous', 'overwhelmed', 'insecure', 'worried', 'frustrated', 'irritated', 'resentful', 'jealous');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date" date NOT NULL,
	"title" text NOT NULL,
	"primary_mood" "primary_mood" NOT NULL,
	"specific_emotion" "specific_emotion" NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "entries_user_id_date_unique" UNIQUE("user_id","date")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "entries" ADD CONSTRAINT "entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

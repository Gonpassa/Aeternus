CREATE TYPE "public"."note_kind" AS ENUM('literature', 'permanent');--> statement-breakpoint
CREATE TABLE "notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"kind" "note_kind" NOT NULL,
	"source_id" integer,
	"title" text,
	"body" text NOT NULL,
	"excerpt" text,
	"section" text,
	"position" text,
	"open_question" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notes_literature_shape" CHECK ("notes"."kind" <> 'literature' OR (
        "notes"."source_id" IS NOT NULL
        AND "notes"."title" IS NULL
        AND (
          coalesce(btrim("notes"."section"), '') <> ''
          OR coalesce(btrim("notes"."position"), '') <> ''
        )
      )),
	CONSTRAINT "notes_permanent_shape" CHECK ("notes"."kind" <> 'permanent' OR (
        "notes"."title" IS NOT NULL
        AND "notes"."source_id" IS NULL
        AND "notes"."excerpt" IS NULL
        AND "notes"."section" IS NULL
        AND "notes"."position" IS NULL
        AND "notes"."open_question" = false
      ))
);
--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notes_id_kind_unique" ON "notes" USING btree ("id","kind");--> statement-breakpoint
CREATE INDEX "notes_user_id_kind_idx" ON "notes" USING btree ("user_id","kind");--> statement-breakpoint
CREATE INDEX "notes_source_id_created_at_idx" ON "notes" USING btree ("source_id","created_at");
CREATE TYPE "public"."review_answer" AS ENUM('nothing_here', 'link_made', 'permanent_note_written');--> statement-breakpoint
CREATE TABLE "review_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"note_id" integer NOT NULL,
	"note_kind" "note_kind" NOT NULL,
	"answer" "review_answer" NOT NULL,
	"produced_link_id" integer,
	"produced_note_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "review_answers_literature_only" CHECK ("review_answers"."note_kind" = 'literature'),
	CONSTRAINT "review_answers_produced_shape" CHECK (CASE "review_answers"."answer"
        WHEN 'nothing_here' THEN "review_answers"."produced_link_id" IS NULL AND "review_answers"."produced_note_id" IS NULL
        WHEN 'link_made' THEN "review_answers"."produced_note_id" IS NULL
        ELSE "review_answers"."produced_link_id" IS NULL
      END)
);
--> statement-breakpoint
ALTER TABLE "review_answers" ADD CONSTRAINT "review_answers_produced_link_id_links_id_fk" FOREIGN KEY ("produced_link_id") REFERENCES "public"."links"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_answers" ADD CONSTRAINT "review_answers_produced_note_id_notes_id_fk" FOREIGN KEY ("produced_note_id") REFERENCES "public"."notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_answers" ADD CONSTRAINT "review_answers_note_id_note_kind_notes_id_kind_fk" FOREIGN KEY ("note_id","note_kind") REFERENCES "public"."notes"("id","kind") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "review_answers_note_id_created_at_idx" ON "review_answers" USING btree ("note_id","created_at");
CREATE TABLE "links" (
	"id" serial PRIMARY KEY NOT NULL,
	"origin_note_id" integer NOT NULL,
	"target_note_id" integer NOT NULL,
	"reason" text NOT NULL,
	"target_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "links_not_self" CHECK ("links"."origin_note_id" <> "links"."target_note_id")
);
--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_origin_note_id_notes_id_fk" FOREIGN KEY ("origin_note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_target_note_id_notes_id_fk" FOREIGN KEY ("target_note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "links_unordered_pair_unique" ON "links" USING btree (least("origin_note_id", "target_note_id"),greatest("origin_note_id", "target_note_id"));--> statement-breakpoint
CREATE INDEX "links_origin_note_id_idx" ON "links" USING btree ("origin_note_id");--> statement-breakpoint
CREATE INDEX "links_target_note_id_idx" ON "links" USING btree ("target_note_id");
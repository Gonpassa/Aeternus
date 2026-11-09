CREATE TABLE "note_topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"note_id" integer NOT NULL,
	"note_kind" "note_kind" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "note_topics_permanent_only" CHECK ("note_topics"."note_kind" = 'permanent')
);
--> statement-breakpoint
CREATE TABLE "source_topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"source_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note_topics" ADD CONSTRAINT "note_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_topics" ADD CONSTRAINT "note_topics_note_id_note_kind_notes_id_kind_fk" FOREIGN KEY ("note_id","note_kind") REFERENCES "public"."notes"("id","kind") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_topics" ADD CONSTRAINT "source_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_topics" ADD CONSTRAINT "source_topics_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "note_topics_topic_id_note_id_unique" ON "note_topics" USING btree ("topic_id","note_id");--> statement-breakpoint
CREATE INDEX "note_topics_note_id_idx" ON "note_topics" USING btree ("note_id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_topics_topic_id_source_id_unique" ON "source_topics" USING btree ("topic_id","source_id");--> statement-breakpoint
CREATE INDEX "source_topics_source_id_idx" ON "source_topics" USING btree ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "topics_user_id_lower_name_unique" ON "topics" USING btree ("user_id",lower("name"));
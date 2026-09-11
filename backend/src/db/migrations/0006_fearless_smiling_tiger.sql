CREATE TYPE "public"."analysis_pass_type" AS ENUM('analytic', 'synthetic');--> statement-breakpoint
CREATE TYPE "public"."association_kind" AS ENUM('personal', 'cultural');--> statement-breakpoint
CREATE TABLE "analysis_passes" (
	"id" serial PRIMARY KEY NOT NULL,
	"dream_id" integer NOT NULL,
	"anchor_id" integer,
	"type" "analysis_pass_type" NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "associations" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol_attachment_id" integer NOT NULL,
	"content" text NOT NULL,
	"kind" "association_kind" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "symbol_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol_id" integer NOT NULL,
	"anchor_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "symbols" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analysis_passes" ADD CONSTRAINT "analysis_passes_dream_id_dreams_id_fk" FOREIGN KEY ("dream_id") REFERENCES "public"."dreams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_passes" ADD CONSTRAINT "analysis_passes_anchor_id_anchors_id_fk" FOREIGN KEY ("anchor_id") REFERENCES "public"."anchors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "associations" ADD CONSTRAINT "associations_symbol_attachment_id_symbol_attachments_id_fk" FOREIGN KEY ("symbol_attachment_id") REFERENCES "public"."symbol_attachments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "symbol_attachments" ADD CONSTRAINT "symbol_attachments_symbol_id_symbols_id_fk" FOREIGN KEY ("symbol_id") REFERENCES "public"."symbols"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "symbol_attachments" ADD CONSTRAINT "symbol_attachments_anchor_id_anchors_id_fk" FOREIGN KEY ("anchor_id") REFERENCES "public"."anchors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "symbols" ADD CONSTRAINT "symbols_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "symbols_user_id_lower_name_unique" ON "symbols" USING btree ("user_id",lower("name"));
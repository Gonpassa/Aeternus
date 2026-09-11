ALTER TABLE "associations" DROP CONSTRAINT "associations_symbol_attachment_id_symbol_attachments_id_fk";--> statement-breakpoint
ALTER TABLE "associations" ALTER COLUMN "symbol_attachment_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "associations" ADD COLUMN "anchor_id" integer;--> statement-breakpoint
UPDATE "associations" a
SET "anchor_id" = sa."anchor_id"
FROM "symbol_attachments" sa
WHERE a."symbol_attachment_id" = sa."id";--> statement-breakpoint
ALTER TABLE "associations" ALTER COLUMN "anchor_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "associations" ADD CONSTRAINT "associations_anchor_id_anchors_id_fk" FOREIGN KEY ("anchor_id") REFERENCES "public"."anchors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Lets the composite FK below reference (id, anchor_id) together as a unit.
CREATE UNIQUE INDEX "symbol_attachments_id_anchor_id_unique" ON "symbol_attachments" USING btree ("id","anchor_id");--> statement-breakpoint
-- A symbol_attachment_id, when present, must name an attachment on this same anchor_id - a
-- symbol-level Association can't drift onto a different passage than its symbol tag (issue
-- #52). Expressed as a composite FK rather than a single-column one: Postgres's default
-- MATCH SIMPLE skips the check entirely when symbol_attachment_id is null, which is exactly
-- the anchor-level case, so this needs no separate trigger.
ALTER TABLE "associations" ADD CONSTRAINT "associations_symbol_attachment_id_anchor_id_symbol_attachments_id_anchor_id_fk" FOREIGN KEY ("symbol_attachment_id","anchor_id") REFERENCES "public"."symbol_attachments"("id","anchor_id") ON DELETE cascade ON UPDATE no action;

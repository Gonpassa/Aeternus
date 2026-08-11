ALTER TABLE "entries" ALTER COLUMN "specific_emotion" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "entries" ALTER COLUMN "specific_emotion" DROP NOT NULL;--> statement-breakpoint
DROP TYPE "public"."specific_emotion";
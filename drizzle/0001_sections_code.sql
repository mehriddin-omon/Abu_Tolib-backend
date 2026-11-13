ALTER TABLE "sections" ADD COLUMN "code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_code_unique" UNIQUE("code");
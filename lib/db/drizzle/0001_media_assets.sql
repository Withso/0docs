CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"mime_type" varchar(128) NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage" varchar(32) NOT NULL,
	"storage_key" text NOT NULL,
	"uploaded_by_user_id" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "media_assets_project_idx" ON "media_assets" ("project_id");
--> statement-breakpoint
CREATE TABLE "media_blobs" (
	"asset_id" uuid PRIMARY KEY NOT NULL,
	"data" bytea NOT NULL,
	"size_bytes" bigint NOT NULL,
	CONSTRAINT "media_blobs_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id") ON DELETE CASCADE
);

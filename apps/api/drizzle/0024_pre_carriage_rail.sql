-- Pre-carriage TRAIN is now called RAIL.
UPDATE "commercial_invoices" SET "pre_carriage_by" = 'RAIL' WHERE upper(trim("pre_carriage_by")) = 'TRAIN';--> statement-breakpoint
UPDATE "production_orders" SET "pre_carriage_by" = 'RAIL' WHERE upper(trim("pre_carriage_by")) = 'TRAIN';

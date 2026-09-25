-- Add a product filter type and classify anti-tarnish materials.
ALTER TABLE "product_filter_attributes" ADD COLUMN "type" TEXT;

UPDATE "product_filter_attributes"
SET "type" = 'Anti Tarnish'
WHERE LOWER(BTRIM("material")) IN ('titanium steel', 'stainless steel');

CREATE INDEX "product_filter_attributes_type_idx" ON "product_filter_attributes"("type");

-- AlterTable
ALTER TABLE "product_sku_list" ADD COLUMN     "shipping_height" DOUBLE PRECISION,
ADD COLUMN     "shipping_length" DOUBLE PRECISION,
ADD COLUMN     "shipping_width" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "product_videos" ADD COLUMN     "video_s3" TEXT;

-- AlterTable
ALTER TABLE "productdetail" ADD COLUMN     "description_en" TEXT;

-- AlterTable
ALTER TABLE "productshop" ADD COLUMN     "batch_number" JSONB,
ADD COLUMN     "channel_price" DOUBLE PRECISION,
ADD COLUMN     "dajisaas_category_id" INTEGER,
ADD COLUMN     "dajisaas_category_name" TEXT,
ADD COLUMN     "min_order_quantity" INTEGER,
ADD COLUMN     "origin_address" TEXT,
ADD COLUMN     "product_cargo_number" TEXT,
ADD COLUMN     "shipping_height" DOUBLE PRECISION,
ADD COLUMN     "shipping_length" DOUBLE PRECISION,
ADD COLUMN     "shipping_time_guarantee" TEXT,
ADD COLUMN     "shipping_weight" DOUBLE PRECISION,
ADD COLUMN     "shipping_width" DOUBLE PRECISION,
ADD COLUMN     "trade_score" TEXT;

-- CreateTable
CREATE TABLE "product_translated_image" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "s3Url" TEXT,

    CONSTRAINT "product_translated_image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_translated_image_product_id" ON "product_translated_image"("productId");

-- AddForeignKey
ALTER TABLE "product_translated_image" ADD CONSTRAINT "product_translated_image_productId_fkey" FOREIGN KEY ("productId") REFERENCES "productdetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

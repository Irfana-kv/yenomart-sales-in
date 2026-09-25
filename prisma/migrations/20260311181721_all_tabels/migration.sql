-- AlterTable
ALTER TABLE "product_attributes" ADD COLUMN     "name_en" TEXT,
ADD COLUMN     "value_en" TEXT;

-- AlterTable
ALTER TABLE "productshop" ADD COLUMN     "month_sold" INTEGER;

-- CreateTable
CREATE TABLE "DajiOrder" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER,
    "user_id" INTEGER,
    "supplier_id" TEXT,
    "third_order_id" TEXT,
    "daji_order_id" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "code" INTEGER,
    "message" TEXT,
    "business_code" TEXT,
    "business_message" TEXT,
    "total_success_amount" INTEGER,
    "post_fee" INTEGER,
    "account_period" JSONB,
    "failed_offer_list" JSONB,
    "order_list" JSONB,
    "sent_sku_count" INTEGER,
    "request_payload" JSONB,
    "response_payload" JSONB,
    "warnings" JSONB,
    "trace_id" TEXT,
    "daji_timestamp" BIGINT,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DajiOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DajiOrder_order_id_idx" ON "DajiOrder"("order_id");

-- CreateIndex
CREATE INDEX "DajiOrder_user_id_idx" ON "DajiOrder"("user_id");

-- CreateIndex
CREATE INDEX "DajiOrder_daji_order_id_idx" ON "DajiOrder"("daji_order_id");

-- CreateIndex
CREATE INDEX "DajiOrder_third_order_id_idx" ON "DajiOrder"("third_order_id");

-- AddForeignKey
ALTER TABLE "DajiOrder" ADD CONSTRAINT "DajiOrder_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DajiOrder" ADD CONSTRAINT "DajiOrder_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

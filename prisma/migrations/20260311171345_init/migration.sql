-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('unpaid', 'paid', 'refunded', 'failed');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returned');

-- CreateEnum
CREATE TYPE "ShippingType" AS ENUM ('home_delivery', 'pickup_point');

-- CreateEnum
CREATE TYPE "MeasurementType" AS ENUM ('KG', 'GRAM', 'LITER', 'ML', 'PCS');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('pending', 'reviewing', 'contacted', 'waiting_for_customer', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('INR', 'USD', 'AED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "access_token" TEXT,
    "address" TEXT,
    "avatar" TEXT,
    "avatar_original" TEXT,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "city" TEXT,
    "country" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customer_package_id" INTEGER,
    "device_token" TEXT,
    "email_verified_at" TIMESTAMP(3),
    "new_email_verificiation_code" TEXT,
    "password" TEXT,
    "country_code" TEXT,
    "phone" TEXT,
    "postal_code" TEXT,
    "provider" TEXT,
    "provider_id" TEXT,
    "referral_code" TEXT,
    "referred_by" INTEGER DEFAULT 0,
    "refresh_token" TEXT,
    "remaining_uploads" INTEGER NOT NULL DEFAULT 0,
    "remember_token" TEXT,
    "state" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_type" TEXT NOT NULL DEFAULT 'customer',
    "verification_code" TEXT,
    "verification_code_expiry" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "meta_title" TEXT NOT NULL,
    "meta_description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parent_Attribute" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Parent_Attribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attribute_Values" (
    "id" SERIAL NOT NULL,
    "attribute_id" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "color_code" TEXT,

    CONSTRAINT "Attribute_Values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Color" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Color_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "added_by" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "subcategory_id" INTEGER,
    "brand_id" INTEGER NOT NULL,
    "photos" JSONB,
    "thumbnail_img" TEXT NOT NULL,
    "video_provider" TEXT,
    "video_link" TEXT,
    "tags" TEXT,
    "description" TEXT,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "variant_product" BOOLEAN NOT NULL DEFAULT false,
    "attributes" JSONB,
    "choice_options" JSONB,
    "colors" JSONB,
    "variations" JSONB,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "current_stock" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT,
    "weight" DOUBLE PRECISION,
    "min_qty" INTEGER NOT NULL DEFAULT 1,
    "discount" DOUBLE PRECISION DEFAULT 0,
    "discount_type" TEXT,
    "meta_title" TEXT,
    "meta_description" TEXT,
    "meta_img" TEXT,
    "pdf" TEXT,
    "slug" TEXT NOT NULL,
    "rating" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "sku" TEXT,
    "three_d_products" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product_stocks" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "variant" TEXT,
    "sku" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "price" INTEGER,
    "qty" INTEGER,

    CONSTRAINT "Product_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" SERIAL NOT NULL,
    "owner_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    "temp_user_id" INTEGER,
    "address_id" INTEGER NOT NULL DEFAULT 0,
    "productId" TEXT NOT NULL,
    "productSkuId" INTEGER,
    "variation" JSONB,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "shipping_cost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "shipping_type" TEXT,
    "pickup_point" TEXT,
    "carrier_id" INTEGER,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "product_referral_code" TEXT,
    "coupon_code" TEXT,
    "coupon_applied" BOOLEAN NOT NULL DEFAULT false,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT,
    "address" TEXT,
    "countryId" INTEGER NOT NULL,
    "stateId" INTEGER NOT NULL,
    "city" TEXT NOT NULL,
    "longitude" TEXT,
    "latitude" TEXT,
    "postalCode" TEXT NOT NULL,
    "country_code" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "setDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zoneId" INTEGER,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "State" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "countryId" INTEGER NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "orderNo" TEXT,
    "combined_order_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    "shipping_address_id" INTEGER,
    "additional_info" TEXT,
    "shipping_type" "ShippingType",
    "shippingMethod" TEXT,
    "shipping_charge" DOUBLE PRECISION,
    "addressSnapshot" JSONB,
    "pickup_point_id" INTEGER NOT NULL DEFAULT 0,
    "delivery_status" "DeliveryStatus" NOT NULL DEFAULT 'pending',
    "payment_type" VARCHAR(20),
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'unpaid',
    "payment_details" TEXT,
    "sub_total" DOUBLE PRECISION,
    "grand_total" DOUBLE PRECISION,
    "coupon_discount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "code" TEXT,
    "tracking_code" VARCHAR(255),
    "date" INTEGER,
    "viewed" INTEGER NOT NULL DEFAULT 0,
    "delivery_viewed" INTEGER NOT NULL DEFAULT 1,
    "payment_status_viewed" INTEGER DEFAULT 1,
    "commission_calculated" INTEGER DEFAULT 0,
    "currency" "Currency" NOT NULL DEFAULT 'INR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderDetail" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "product_price" DOUBLE PRECISION,
    "product_title" TEXT,
    "product_en_title" TEXT,
    "product_shop_name" TEXT,
    "product_main_image_s3" TEXT,
    "product_shipping_charge_sea" DOUBLE PRECISION,
    "product_shipping_charge_air" DOUBLE PRECISION,
    "product_weight" DOUBLE PRECISION,
    "product_measurement_type" "MeasurementType" NOT NULL DEFAULT 'GRAM',
    "productSkuId" INTEGER,
    "productSku_s3Url" TEXT,
    "productSku_price" DOUBLE PRECISION,
    "productSku_properties" JSONB,
    "productSku_shipping_charge_sea" DOUBLE PRECISION,
    "productSku_shipping_charge_air" DOUBLE PRECISION,
    "productSku_weight" DOUBLE PRECISION,
    "productSku_measurement_type" "MeasurementType" NOT NULL DEFAULT 'GRAM',
    "variation" JSONB,
    "price" DOUBLE PRECISION,
    "tax" DOUBLE PRECISION,
    "shipping_cost" DOUBLE PRECISION,
    "quantity" INTEGER,
    "payment_status" "PaymentStatus",
    "delivery_status" "DeliveryStatus",
    "shipping_type" "ShippingType",
    "pickup_point_id" INTEGER,
    "product_referral_code" TEXT,
    "earn_point" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderPayment" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'unpaid',
    "transactionId" TEXT,
    "gatewayOrderId" TEXT,
    "gatewayResponse" JSONB,

    CONSTRAINT "OrderPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL,
    "note" TEXT,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeMainBanner" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "desktopImageUrl" TEXT NOT NULL,
    "mobImageUrl" TEXT NOT NULL,
    "type" TEXT,
    "targetlink" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeMainBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiProducts" (
    "id" SERIAL NOT NULL,
    "itemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "multiLanguageTitle" TEXT,
    "mainImageUrl" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "couponPrice" DOUBLE PRECISION,
    "shopName" TEXT NOT NULL,
    "inventory" INTEGER,
    "sales" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiProducts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiCategory" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isLeaf" BOOLEAN NOT NULL DEFAULT false,
    "categoryType" TEXT,
    "parentId" BIGINT,
    "level" INTEGER,
    "image" TEXT,
    "banner" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "featuredone" BOOLEAN NOT NULL DEFAULT false,
    "featuredthree" BOOLEAN NOT NULL DEFAULT false,
    "featuredtwo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ApiCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "main_banners" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "desktopImageUrl" TEXT NOT NULL,
    "mobImageUrl" TEXT NOT NULL,
    "type" TEXT,
    "targetlink" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "main_banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_banners" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT,
    "targetlink" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "desktopImageUrl" TEXT NOT NULL,
    "urltype" TEXT,

    CONSTRAINT "category_banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trending_videos" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "video" TEXT,
    "image" TEXT,
    "urltype" TEXT,
    "type" TEXT,
    "targetlink" TEXT,
    "productShopId" TEXT,
    "price" TEXT,
    "author" TEXT,
    "authorThumbnail" TEXT,
    "like" INTEGER NOT NULL DEFAULT 0,
    "share" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trending_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" INTEGER,
    "banner" TEXT,
    "icon" TEXT,
    "cover_image" TEXT,
    "slug" TEXT NOT NULL,
    "meta_title" TEXT,
    "meta_description" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productshop" (
    "id" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "promotion_price" DOUBLE PRECISION,
    "coupon_price" DOUBLE PRECISION,
    "inventory" INTEGER,
    "title" TEXT,
    "shipping_charge_sea" DOUBLE PRECISION,
    "shipping_charge_air" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "measurement_type" "MeasurementType" NOT NULL DEFAULT 'GRAM',
    "en_title" TEXT,
    "shop_name" TEXT,
    "main_image_url" TEXT,
    "main_image_s3" TEXT,
    "tags" JSONB,
    "promotions" JSONB,
    "raw_data" JSONB,
    "category_id" INTEGER,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_online_purchase" BOOLEAN NOT NULL DEFAULT true,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" TIMESTAMP(3),
    "image_labels" JSONB,
    "dominant_colors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productshop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productdetail" (
    "id" SERIAL NOT NULL,
    "item_id" TEXT NOT NULL,
    "item_resource" TEXT,
    "shop_name" TEXT,
    "title" TEXT,
    "title_en" TEXT,
    "price" DOUBLE PRECISION,
    "promotion_price" DOUBLE PRECISION,
    "coupon_price" DOUBLE PRECISION,
    "shop_id" TEXT,
    "promotion_displays" JSONB,
    "tags" JSONB,
    "raw_detail_data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productdetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_sku_list" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "picUrl" TEXT,
    "s3Url" TEXT,
    "quantity" INTEGER,
    "promotionPrice" DOUBLE PRECISION,
    "price" DOUBLE PRECISION,
    "shipping_charge_sea" DOUBLE PRECISION,
    "shipping_charge_air" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "measurement_type" "MeasurementType" NOT NULL DEFAULT 'GRAM',
    "skuId" TEXT,
    "properties" JSONB,
    "sales" INTEGER,

    CONSTRAINT "product_sku_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_property_image" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "s3Url" TEXT,
    "properties" TEXT,

    CONSTRAINT "product_property_image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_image" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "s3Url" TEXT,

    CONSTRAINT "product_image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_property" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "propId" BIGINT,
    "propName" TEXT,
    "valueId" BIGINT,
    "valueName" TEXT,

    CONSTRAINT "product_property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_multi_language_info" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "language" TEXT,
    "title" TEXT,
    "description" TEXT,
    "mainImageUrl" TEXT,
    "s3Url" TEXT,
    "data" JSONB,

    CONSTRAINT "product_multi_language_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_description" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "content" TEXT,

    CONSTRAINT "product_description_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "value" DOUBLE PRECISION,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartEnquiry" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "message" TEXT,
    "address" TEXT,
    "total" DOUBLE PRECISION,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CartEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartEnquiryItem" (
    "id" SERIAL NOT NULL,
    "enquiryId" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "productSkuId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "CartEnquiryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendingVideoLikes" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "deviceId" TEXT,
    "trendingVideoId" INTEGER NOT NULL,
    "isLiked" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendingVideoLikes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendingVideoShares" (
    "id" SERIAL NOT NULL,
    "trendingVideoId" INTEGER NOT NULL,
    "userId" INTEGER,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendingVideoShares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceRangeBanner" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "image" TEXT,
    "priceMin" INTEGER,
    "priceMax" INTEGER,
    "category_id" INTEGER,
    "meta_title" TEXT,
    "meta_description" TEXT,
    "meta_keyword" TEXT,
    "og_image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceRangeBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_image_embeddings" (
    "id" BIGSERIAL NOT NULL,
    "product_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "image_type" TEXT,
    "clip_embedding" JSONB,
    "dino_embedding" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_image_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorypagebanners" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT,
    "targetlink" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "desktopImageUrl" TEXT NOT NULL,
    "urltype" TEXT,

    CONSTRAINT "categorypagebanners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attributes" (
    "id" SERIAL NOT NULL,
    "product_id" TEXT NOT NULL,
    "group_name" TEXT,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_videos" (
    "id" SERIAL NOT NULL,
    "product_id" TEXT NOT NULL,
    "video_url" TEXT NOT NULL,
    "cover_url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_referral_code_key" ON "User"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_Attribute_name_key" ON "Parent_Attribute"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Attribute_Values_value_key" ON "Attribute_Values"("value");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_category_id_idx" ON "Product"("category_id");

-- CreateIndex
CREATE INDEX "Product_subcategory_id_idx" ON "Product"("subcategory_id");

-- CreateIndex
CREATE INDEX "Product_brand_id_idx" ON "Product"("brand_id");

-- CreateIndex
CREATE INDEX "Product_user_id_idx" ON "Product"("user_id");

-- CreateIndex
CREATE INDEX "Order_user_id_idx" ON "Order"("user_id");

-- CreateIndex
CREATE INDEX "Order_delivery_status_idx" ON "Order"("delivery_status");

-- CreateIndex
CREATE INDEX "Order_payment_status_idx" ON "Order"("payment_status");

-- CreateIndex
CREATE INDEX "OrderDetail_order_id_idx" ON "OrderDetail"("order_id");

-- CreateIndex
CREATE INDEX "OrderDetail_productId_idx" ON "OrderDetail"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiProducts_itemId_key" ON "ApiProducts"("itemId");

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "productshop_category_id_idx" ON "productshop"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "productdetail_item_id_key" ON "productdetail"("item_id");

-- CreateIndex
CREATE INDEX "productdetail_shop_id_idx" ON "productdetail"("shop_id");

-- CreateIndex
CREATE INDEX "product_sku_list_productId_idx" ON "product_sku_list"("productId");

-- CreateIndex
CREATE INDEX "idx_property_image_product_id" ON "product_property_image"("productId");

-- CreateIndex
CREATE INDEX "idx_product_image_product_id" ON "product_image"("productId");

-- CreateIndex
CREATE INDEX "idx_product_property_product_id" ON "product_property"("productId");

-- CreateIndex
CREATE INDEX "idx_product_description_product_id" ON "product_description"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "TrendingVideoLikes_userId_trendingVideoId_key" ON "TrendingVideoLikes"("userId", "trendingVideoId");

-- CreateIndex
CREATE UNIQUE INDEX "TrendingVideoLikes_deviceId_trendingVideoId_key" ON "TrendingVideoLikes"("deviceId", "trendingVideoId");

-- CreateIndex
CREATE INDEX "product_image_embeddings_product_id_idx" ON "product_image_embeddings"("product_id");

-- CreateIndex
CREATE INDEX "product_attributes_product_id_idx" ON "product_attributes"("product_id");

-- CreateIndex
CREATE INDEX "product_videos_product_id_idx" ON "product_videos"("product_id");

-- AddForeignKey
ALTER TABLE "Attribute_Values" ADD CONSTRAINT "Attribute_Values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "Parent_Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_productId_fkey" FOREIGN KEY ("productId") REFERENCES "productshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_productSkuId_fkey" FOREIGN KEY ("productSkuId") REFERENCES "product_sku_list"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "State" ADD CONSTRAINT "State_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_combined_order_id_fkey" FOREIGN KEY ("combined_order_id") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDetail" ADD CONSTRAINT "OrderDetail_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDetail" ADD CONSTRAINT "OrderDetail_productId_fkey" FOREIGN KEY ("productId") REFERENCES "productshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDetail" ADD CONSTRAINT "OrderDetail_productSkuId_fkey" FOREIGN KEY ("productSkuId") REFERENCES "product_sku_list"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderPayment" ADD CONSTRAINT "OrderPayment_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderPayment" ADD CONSTRAINT "OrderPayment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiCategory" ADD CONSTRAINT "ApiCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ApiCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trending_videos" ADD CONSTRAINT "trending_videos_productShopId_fkey" FOREIGN KEY ("productShopId") REFERENCES "productshop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productshop" ADD CONSTRAINT "productshop_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productdetail" ADD CONSTRAINT "productdetail_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "productshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_sku_list" ADD CONSTRAINT "product_sku_list_productId_fkey" FOREIGN KEY ("productId") REFERENCES "productdetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_property_image" ADD CONSTRAINT "product_property_image_productId_fkey" FOREIGN KEY ("productId") REFERENCES "productdetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_productId_fkey" FOREIGN KEY ("productId") REFERENCES "productdetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_property" ADD CONSTRAINT "product_property_productId_fkey" FOREIGN KEY ("productId") REFERENCES "productdetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_multi_language_info" ADD CONSTRAINT "product_multi_language_info_productId_fkey" FOREIGN KEY ("productId") REFERENCES "productdetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_description" ADD CONSTRAINT "product_description_productId_fkey" FOREIGN KEY ("productId") REFERENCES "productdetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartEnquiryItem" ADD CONSTRAINT "CartEnquiryItem_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "CartEnquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartEnquiryItem" ADD CONSTRAINT "CartEnquiryItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "productshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartEnquiryItem" ADD CONSTRAINT "CartEnquiryItem_productSkuId_fkey" FOREIGN KEY ("productSkuId") REFERENCES "product_sku_list"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrendingVideoLikes" ADD CONSTRAINT "TrendingVideoLikes_trendingVideoId_fkey" FOREIGN KEY ("trendingVideoId") REFERENCES "trending_videos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrendingVideoShares" ADD CONSTRAINT "TrendingVideoShares_trendingVideoId_fkey" FOREIGN KEY ("trendingVideoId") REFERENCES "trending_videos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceRangeBanner" ADD CONSTRAINT "PriceRangeBanner_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_image_embeddings" ADD CONSTRAINT "product_image_embeddings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "productshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "productshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_videos" ADD CONSTRAINT "product_videos_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "productshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

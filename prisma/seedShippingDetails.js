const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function parseRawJson(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

async function withRetry(fn, retries = 5, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`⚠️ DB connection issue: ${err.message}. Retrying in ${delayMs}ms... (Attempt ${i + 1}/${retries})`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

async function runCompleteShippingDetailsSeed() {
  console.log("🚀 Starting fresh, complete ProductShippingDetail seed across ALL database products & ALL 1.67M SKUs...");

  console.log("🧹 Clearing old ProductShippingDetail records for 100% clean population...");
  await withRetry(() => prisma.productShippingDetail.deleteMany({}));

  const BATCH_SIZE = 200;

  // ─────────────────────────────────────────────────────────────────
  // PHASE 1: Process ProductDetail raw JSON (1688 raw data extraction)
  // ─────────────────────────────────────────────────────────────────
  let remainingRawDetails = await withRetry(() => prisma.productDetail.count({
    where: { raw_detail_data: { not: null }, shippingDetails: { none: {} } }
  }));

  console.log(`📦 Phase 1: Processing ${remainingRawDetails} ProductDetail raw JSON records...`);
  while (remainingRawDetails > 0) {
    const chunk = await withRetry(() => prisma.productDetail.findMany({
      where: { raw_detail_data: { not: null }, shippingDetails: { none: {} } },
      select: {
        id: true,
        item_id: true,
        raw_detail_data: true,
        skuList: {
          select: {
            id: true,
            skuId: true,
            weight: true,
            shipping_length: true,
            shipping_width: true,
            shipping_height: true,
            price: true,
            promotionPrice: true,
            quantity: true,
            properties: true
          }
        }
      },
      take: BATCH_SIZE
    }));

    if (chunk.length === 0) break;

    const payloads = [];
    const skuUpdates = [];

    for (const pd of chunk) {
      const rawJson = parseRawJson(pd.raw_detail_data);
      if (!rawJson) continue;

      const offerId = rawJson.offerId ? String(rawJson.offerId) : (pd.item_id ? String(pd.item_id) : null);
      const shippingInfo = rawJson.productShippingInfo || {};
      const cargoNumber = rawJson.productCargoNumber || null;
      const salesUnit = rawJson.productSaleInfo?.unitInfo?.transUnit || rawJson.productSaleInfo?.unitInfo?.unit || null;

      // 1. Product level payload
      payloads.push({
        source_table: "PRODUCTDETAIL",
        productDetailId: pd.id,
        productShopId: pd.item_id ? String(pd.item_id) : null,
        offerId,
        weight: Number(shippingInfo.weight ?? rawJson.weight ?? 0.0) || 0.0,
        length: Number(shippingInfo.length ?? rawJson.length ?? 0.0) || 0.0,
        width: Number(shippingInfo.width ?? rawJson.width ?? 0.0) || 0.0,
        height: Number(shippingInfo.height ?? rawJson.height ?? 0.0) || 0.0,
        measurement_type: "GRAM",
        officialWeight: shippingInfo.officialWeight != null ? Number(shippingInfo.officialWeight) : null,
        officialLength: shippingInfo.officialLength != null ? Number(shippingInfo.officialLength) : null,
        officialWidth: shippingInfo.officialWidth != null ? Number(shippingInfo.officialWidth) : null,
        officialHeight: shippingInfo.officialHeight != null ? Number(shippingInfo.officialHeight) : null,
        pkgSizeSource: shippingInfo.pkgSizeSource || null,
        productCargoNumber: cargoNumber,
        unit: salesUnit,
        sendGoodsAddressText: shippingInfo.sendGoodsAddressText || null,
        shippingTimeGuarantee: shippingInfo.shippingTimeGuarantee ? String(shippingInfo.shippingTimeGuarantee) : null,
        postFee: Number(rawJson.productSaleInfo?.postFee ?? rawJson.postFee ?? 0.0) || 0.0,
        skuShippingDetails: shippingInfo.skuShippingDetails || null,
        skuShippingInfoList: shippingInfo.skuShippingInfoList || null
      });

      // 2. SKU level payloads from skuShippingDetails & skuShippingInfoList
      const skuDetails = shippingInfo.skuShippingDetails || [];
      const skuInfoList = shippingInfo.skuShippingInfoList || [];

      if (skuDetails.length > 0 || skuInfoList.length > 0) {
        const skuMap = new Map();
        pd.skuList.forEach(s => skuMap.set(String(s.skuId), s));

        const allSkuIds = new Set([
          ...skuDetails.map(d => String(d.skuId)),
          ...skuInfoList.map(i => String(i.skuId))
        ]);

        for (const skuIdStr of allSkuIds) {
          if (!skuIdStr || skuIdStr === "undefined") continue;

          const dItem = skuDetails.find(d => String(d.skuId) === skuIdStr);
          const iItem = skuInfoList.find(i => String(i.skuId) === skuIdStr);
          const dbSku = skuMap.get(skuIdStr);

          const skuWeight = Number(dItem?.weight ?? dItem?.aiWeight ?? (iItem?.weight ? iItem.weight / 1000 : 0.0) ?? 0.0) || 0.0;
          const skuLength = Number(dItem?.length ?? iItem?.length ?? 0.0) || 0.0;
          const skuWidth = Number(dItem?.width ?? iItem?.width ?? 0.0) || 0.0;
          const skuHeight = Number(dItem?.height ?? iItem?.height ?? 0.0) || 0.0;

          const aiWeightVal = dItem?.aiWeight != null ? Number(dItem.aiWeight) : null;
          const aiWeightAccuracyVal = dItem?.aiWeightAccuracy ? String(dItem.aiWeightAccuracy) : null;
          const specIdVal = iItem?.specId ? String(iItem.specId) : (dItem?.specId ? String(dItem.specId) : null);

          payloads.push({
            source_table: "PRODUCT_SKU_LIST",
            productDetailId: pd.id,
            productShopId: pd.item_id ? String(pd.item_id) : null,
            productSkuId: dbSku ? dbSku.id : null,
            skuId: skuIdStr,
            offerId,
            weight: skuWeight,
            length: skuLength,
            width: skuWidth,
            height: skuHeight,
            measurement_type: "GRAM",
            officialWeight: dItem?.officialWeight != null ? Number(dItem.officialWeight) : null,
            officialLength: dItem?.officialLength != null ? Number(dItem.officialLength) : null,
            officialWidth: dItem?.officialWidth != null ? Number(dItem.officialWidth) : null,
            officialHeight: dItem?.officialHeight != null ? Number(dItem.officialHeight) : null,
            pkgSizeSource: dItem?.pkgSizeSource || null,
            aiWeight: aiWeightVal,
            aiWeightAccuracy: aiWeightAccuracyVal,
            specId: specIdVal,
            productCargoNumber: cargoNumber,
            unit: salesUnit,
            skuProperties: dbSku?.properties || null,
            price: Number(dbSku?.price ?? 0.0) || 0.0,
            promotionPrice: Number(dbSku?.promotionPrice ?? 0.0) || 0.0,
            quantity: Number(dbSku?.quantity ?? 0) || 0,
            sendGoodsAddressText: shippingInfo.sendGoodsAddressText || null,
            shippingTimeGuarantee: shippingInfo.shippingTimeGuarantee ? String(shippingInfo.shippingTimeGuarantee) : null,
            postFee: Number(rawJson.productSaleInfo?.postFee ?? rawJson.postFee ?? 0.0) || 0.0,
            skuShippingDetails: dItem || null,
            skuShippingInfoList: iItem || null
          });

          if (dbSku && (skuWeight > 0 || skuLength > 0 || skuWidth > 0 || skuHeight > 0)) {
            const updateData = {};
            if ((!dbSku.weight || dbSku.weight === 0) && skuWeight > 0) updateData.weight = skuWeight;
            if ((!dbSku.shipping_length || dbSku.shipping_length === 0) && skuLength > 0) updateData.shipping_length = skuLength;
            if ((!dbSku.shipping_width || dbSku.shipping_width === 0) && skuWidth > 0) updateData.shipping_width = skuWidth;
            if ((!dbSku.shipping_height || dbSku.shipping_height === 0) && skuHeight > 0) updateData.shipping_height = skuHeight;

            if (Object.keys(updateData).length > 0) {
              skuUpdates.push(
                prisma.productSkuList.update({
                  where: { id: dbSku.id },
                  data: updateData
                }).catch(() => {})
              );
            }
          }
        }
      }
    }

    if (payloads.length > 0) {
      await withRetry(() => prisma.productShippingDetail.createMany({ data: payloads, skipDuplicates: true }));
    }

    if (skuUpdates.length > 0) {
      const BATCH_PARALLEL = 50;
      for (let i = 0; i < skuUpdates.length; i += BATCH_PARALLEL) {
        await Promise.all(skuUpdates.slice(i, i + BATCH_PARALLEL));
      }
    }

    remainingRawDetails = await withRetry(() => prisma.productDetail.count({
      where: { raw_detail_data: { not: null }, shippingDetails: { none: {} } }
    }));
  }

  // ─────────────────────────────────────────────────────────────────
  // PHASE 2: Process ProductShop raw JSON
  // ─────────────────────────────────────────────────────────────────
  let remainingRawShops = await withRetry(() => prisma.productShop.count({
    where: { raw_data: { not: null }, shippingDetails: { none: {} } }
  }));

  console.log(`🏪 Phase 2: Processing ${remainingRawShops} ProductShop raw JSON records...`);
  while (remainingRawShops > 0) {
    const chunk = await withRetry(() => prisma.productShop.findMany({
      where: { raw_data: { not: null }, shippingDetails: { none: {} } },
      select: { id: true, raw_data: true },
      take: BATCH_SIZE
    }));
    if (chunk.length === 0) break;

    const payloads = [];
    for (const ps of chunk) {
      const rawJson = parseRawJson(ps.raw_data);
      if (!rawJson) continue;

      const offerId = rawJson.offerId ? String(rawJson.offerId) : String(ps.id);
      const shippingInfo = rawJson.productShippingInfo || {};
      const cargoNumber = rawJson.productCargoNumber || null;
      const salesUnit = rawJson.productSaleInfo?.unitInfo?.transUnit || rawJson.productSaleInfo?.unitInfo?.unit || null;

      payloads.push({
        source_table: "PRODUCTSHOP",
        productShopId: ps.id,
        offerId,
        weight: Number(shippingInfo.weight ?? rawJson.weight ?? 0.0) || 0.0,
        length: Number(shippingInfo.length ?? rawJson.length ?? 0.0) || 0.0,
        width: Number(shippingInfo.width ?? rawJson.width ?? 0.0) || 0.0,
        height: Number(shippingInfo.height ?? rawJson.height ?? 0.0) || 0.0,
        measurement_type: "GRAM",
        officialWeight: shippingInfo.officialWeight != null ? Number(shippingInfo.officialWeight) : null,
        officialLength: shippingInfo.officialLength != null ? Number(shippingInfo.officialLength) : null,
        officialWidth: shippingInfo.officialWidth != null ? Number(shippingInfo.officialWidth) : null,
        officialHeight: shippingInfo.officialHeight != null ? Number(shippingInfo.officialHeight) : null,
        pkgSizeSource: shippingInfo.pkgSizeSource || null,
        productCargoNumber: cargoNumber,
        unit: salesUnit,
        sendGoodsAddressText: shippingInfo.sendGoodsAddressText || null,
        shippingTimeGuarantee: shippingInfo.shippingTimeGuarantee ? String(shippingInfo.shippingTimeGuarantee) : null,
        postFee: Number(rawJson.productSaleInfo?.postFee ?? rawJson.postFee ?? 0.0) || 0.0,
        skuShippingDetails: shippingInfo.skuShippingDetails || null,
        skuShippingInfoList: shippingInfo.skuShippingInfoList || null
      });
    }

    if (payloads.length > 0) {
      await withRetry(() => prisma.productShippingDetail.createMany({ data: payloads, skipDuplicates: true }));
    }

    remainingRawShops = await withRetry(() => prisma.productShop.count({
      where: { raw_data: { not: null }, shippingDetails: { none: {} } }
    }));
  }

  // ─────────────────────────────────────────────────────────────────
  // PHASE 3: Process remaining ProductShop rows (from direct table columns)
  // ─────────────────────────────────────────────────────────────────
  let remainingShopsColumns = await withRetry(() => prisma.productShop.count({
    where: { shippingDetails: { none: {} } }
  }));

  console.log(`⚡ Phase 3: Processing ${remainingShopsColumns} remaining ProductShop rows...`);
  let shopColProcessed = 0;
  while (remainingShopsColumns > 0) {
    const chunk = await withRetry(() => prisma.productShop.findMany({
      where: { shippingDetails: { none: {} } },
      select: {
        id: true,
        weight: true,
        shipping_weight: true,
        shipping_length: true,
        shipping_width: true,
        shipping_height: true,
        shipping_charge_sea: true,
        shipping_charge_air: true,
        origin_address: true,
        shipping_time_guarantee: true,
        measurement_type: true
      },
      take: BATCH_SIZE
    }));
    if (chunk.length === 0) break;

    const payloads = chunk.map(ps => ({
      source_table: "PRODUCTSHOP",
      productShopId: ps.id,
      offerId: ps.id,
      weight: Number(ps.weight ?? ps.shipping_weight ?? 0.0) || 0.0,
      length: Number(ps.shipping_length ?? 0.0) || 0.0,
      width: Number(ps.shipping_width ?? 0.0) || 0.0,
      height: Number(ps.shipping_height ?? 0.0) || 0.0,
      measurement_type: ps.measurement_type || "GRAM",
      shipping_charge_sea: Number(ps.shipping_charge_sea ?? 0.0) || 0.0,
      shipping_charge_air: Number(ps.shipping_charge_air ?? 0.0) || 0.0,
      sendGoodsAddressText: ps.origin_address || null,
      shippingTimeGuarantee: ps.shipping_time_guarantee || null
    }));

    await withRetry(() => prisma.productShippingDetail.createMany({ data: payloads, skipDuplicates: true }));
    shopColProcessed += chunk.length;

    remainingShopsColumns = await withRetry(() => prisma.productShop.count({
      where: { shippingDetails: { none: {} } }
    }));
  }

  // ─────────────────────────────────────────────────────────────────
  // PHASE 4: Process remaining ProductDetail rows (Product level ONLY)
  // ─────────────────────────────────────────────────────────────────
  let remainingDetailColumns = await withRetry(() => prisma.productDetail.count({
    where: { shippingDetails: { none: {} } }
  }));

  console.log(`⚡ Phase 4: Processing ${remainingDetailColumns} remaining ProductDetail rows (Product level)...`);
  let detailColProcessed = 0;
  while (remainingDetailColumns > 0) {
    const chunk = await withRetry(() => prisma.productDetail.findMany({
      where: { shippingDetails: { none: {} } },
      select: {
        id: true,
        item_id: true,
        skuList: {
          select: {
            weight: true,
            shipping_length: true,
            shipping_width: true,
            shipping_height: true,
            shipping_charge_sea: true,
            shipping_charge_air: true,
            measurement_type: true
          },
          take: 1
        }
      },
      take: BATCH_SIZE
    }));
    if (chunk.length === 0) break;

    const payloads = chunk.map(pd => {
      const firstSku = pd.skuList?.[0] || {};
      return {
        source_table: "PRODUCTDETAIL",
        productDetailId: pd.id,
        productSkuId: null, // Product level only
        offerId: pd.item_id ? String(pd.item_id) : null,
        weight: Number(firstSku.weight ?? 0.0) || 0.0,
        length: Number(firstSku.shipping_length ?? 0.0) || 0.0,
        width: Number(firstSku.shipping_width ?? 0.0) || 0.0,
        height: Number(firstSku.shipping_height ?? 0.0) || 0.0,
        measurement_type: firstSku.measurement_type || "GRAM",
        shipping_charge_sea: Number(firstSku.shipping_charge_sea ?? 0.0) || 0.0,
        shipping_charge_air: Number(firstSku.shipping_charge_air ?? 0.0) || 0.0
      };
    });

    await withRetry(() => prisma.productShippingDetail.createMany({ data: payloads, skipDuplicates: true }));
    detailColProcessed += chunk.length;

    remainingDetailColumns = await withRetry(() => prisma.productDetail.count({
      where: { shippingDetails: { none: {} } }
    }));
  }

  // ─────────────────────────────────────────────────────────────────
  // PHASE 5: Process ALL remaining ProductSkuList rows (all 1.67M SKUs)
  // ─────────────────────────────────────────────────────────────────
  let remainingSkuCount = await withRetry(() => prisma.productSkuList.count({
    where: { shippingDetails: { none: {} } }
  }));

  const SKU_BATCH_SIZE = 5000;
  console.log(`📦 Phase 5: Processing ${remainingSkuCount} remaining ProductSkuList rows into ProductShippingDetail...`);
  let skuProcessed = 0;

  while (remainingSkuCount > 0) {
    const chunk = await withRetry(() => prisma.productSkuList.findMany({
      where: { shippingDetails: { none: {} } },
      select: {
        id: true,
        productId: true,
        skuId: true,
        weight: true,
        shipping_length: true,
        shipping_width: true,
        shipping_height: true,
        shipping_charge_sea: true,
        shipping_charge_air: true,
        measurement_type: true,
        price: true,
        promotionPrice: true,
        quantity: true,
        properties: true
      },
      take: SKU_BATCH_SIZE
    }));

    if (chunk.length === 0) break;

    const payloads = chunk.map(s => ({
      source_table: "PRODUCT_SKU_LIST",
      productSkuId: s.id,
      productDetailId: s.productId,
      skuId: s.skuId ? String(s.skuId) : null,
      skuProperties: s.properties || null,
      price: Number(s.price ?? 0.0) || 0.0,
      promotionPrice: Number(s.promotionPrice ?? 0.0) || 0.0,
      quantity: Number(s.quantity ?? 0) || 0,
      weight: Number(s.weight ?? 0.0) || 0.0,
      length: Number(s.shipping_length ?? 0.0) || 0.0,
      width: Number(s.shipping_width ?? 0.0) || 0.0,
      height: Number(s.shipping_height ?? 0.0) || 0.0,
      shipping_charge_sea: Number(s.shipping_charge_sea ?? 0.0) || 0.0,
      shipping_charge_air: Number(s.shipping_charge_air ?? 0.0) || 0.0,
      measurement_type: s.measurement_type || "GRAM"
    }));

    await withRetry(() => prisma.productShippingDetail.createMany({ data: payloads, skipDuplicates: true }));
    skuProcessed += chunk.length;
    console.log(`  Progress ProductSkuList: ${skuProcessed} SKUs processed... (Remaining: ${remainingSkuCount - chunk.length})`);

    remainingSkuCount = await withRetry(() => prisma.productSkuList.count({
      where: { shippingDetails: { none: {} } }
    }));
  }

  const grandTotal = await withRetry(() => prisma.productShippingDetail.count());
  const bySource = await withRetry(() => prisma.productShippingDetail.groupBy({
    by: ['source_table'],
    _count: { id: true }
  }));

  console.log(`\n🎉 Grand Total ProductShippingDetail records in database: ${grandTotal}`);
  console.log("📊 Source Breakdown:", JSON.stringify(bySource, null, 2));
}

runCompleteShippingDetailsSeed()
  .catch(err => {
    console.error("Fatal seed error:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

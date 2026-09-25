import { prisma } from "@/lib/prisma";

export function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function formatINR(value, options = {}) {
  const minimumFractionDigits = options.minimumFractionDigits ?? 2;
  const maximumFractionDigits = options.maximumFractionDigits ?? 2;

  return toNumber(value).toLocaleString("en-IN", {
    minimumFractionDigits,
    maximumFractionDigits,
  });
}

export function formatInr(value, options = {}) {
  return formatINR(value, options);
}

/**
 * Fetch all active pricing rules from PricingRuleConfig and fallback PricingRule
 */
export async function getAllPricingRules() {
  try {
    const configRules = await prisma.pricingRuleConfig.findMany({
      where: { is_active: true, is_deleted: false },
      orderBy: [
        { priority: "desc" },
        { min_price: "asc" },
      ],
    });

    const legacyRules = await prisma.pricingRule.findMany({
      orderBy: { max_price: "asc" },
    });

    const mappedLegacy = legacyRules.map((r) => ({
      id: `legacy_${r.id}`,
      name: `Global Rule (Up to ${r.max_price} INR)`,
      scope: "GLOBAL",
      min_price: 0,
      max_price: r.max_price,
      pricing_type: "PERCENTAGE_MARGIN",
      margin_percent: r.tier1_margin,
      tier1_min_qty: r.tier1_min_qty || 1,
      tier1_type: "PERCENTAGE_MARGIN",
      tier1_value: r.tier1_margin,
      tier2_min_qty: r.tier2_min_qty,
      tier2_type: r.tier2_margin != null ? "PERCENTAGE_MARGIN" : null,
      tier2_value: r.tier2_margin,
      tier3_min_qty: r.tier3_min_qty,
      tier3_type: r.tier3_margin != null ? "PERCENTAGE_MARGIN" : null,
      tier3_value: r.tier3_margin,
      is_active: true,
      priority: -1,
    }));

    return [...configRules, ...mappedLegacy];
  } catch (error) {
    console.error("Error fetching all pricing rules:", error);
    return [];
  }
}

export function findPricingRule(basePrice, rules = [], context = {}) {
  const amount = toNumber(basePrice);
  const catId = context?.categoryId != null
    ? Number(context.categoryId)
    : (context?.category_id != null ? Number(context.category_id) : null);

  const shopName = context?.shopName
    ? String(context.shopName).trim()
    : (context?.shop_name ? String(context.shop_name).trim() : null);

  const productId = context?.productId
    ? String(context.productId).trim()
    : (context?.product_id ? String(context.product_id).trim() : (context?.id ? String(context.id).trim() : null));

  return [...rules]
    .filter((rule) => {
      const min = rule?.min_price != null ? toNumber(rule.min_price) : 0;
      const max = rule?.max_price != null ? toNumber(rule.max_price) : Infinity;
      const inRange = amount >= min && amount <= max;
      if (!inRange) return false;

      // Validate scope context matching
      const scope = rule?.scope || "GLOBAL";
      if (scope === "CATEGORY") {
        if (catId == null || rule.category_id == null || Number(rule.category_id) !== catId) {
          return false;
        }
      } else if (scope === "SHOP") {
        if (!shopName || !rule.shop_name || String(rule.shop_name).trim().toLowerCase() !== shopName.toLowerCase()) {
          return false;
        }
      } else if (scope === "PRODUCT") {
        if (!productId || !rule.product_id || String(rule.product_id).trim() !== productId) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;
      if (priorityB !== priorityA) return priorityB - priorityA;

      const spanA = toNumber(a.max_price ?? 999999) - toNumber(a.min_price ?? 0);
      const spanB = toNumber(b.max_price ?? 999999) - toNumber(b.min_price ?? 0);
      if (spanA !== spanB) return spanA - spanB;

      return toNumber(a.min_price) - toNumber(b.min_price);
    })[0] || null;
}

export function calculateTierPrice(basePrice, margin, calcType = "PERCENTAGE_MARGIN") {
  const base = toNumber(basePrice);
  const val = toNumber(margin);

  if (calcType === "FIXED_SELLING_PRICE") {
    return Number(val.toFixed(2));
  }
  if (calcType === "FIXED_AMOUNT") {
    return Number((base + val).toFixed(2));
  }
  return Number((base + (base * val) / 100).toFixed(2));
}

export function convertToINR(price, INRRate) {
  return Number((toNumber(price) * toNumber(INRRate, 1)).toFixed(2));
}

export function convertToInr(price, inrRate) {
  return convertToINR(price, inrRate);
}

export function pickEffectiveRawPrice({ price, promotionPrice }) {
  return toNumber(price);
}

export function pickLowestSkuRawPrice(skuList = []) {
  const prices = skuList
    .map((sku) => pickEffectiveRawPrice({
      price: sku?.price,
      promotionPrice: sku?.promotionPrice,
    }))
    .filter((price) => price > 0);

  return prices.length ? Math.min(...prices) : null;
}

export function pickProductRawPrice({ productPrice, productPromotionPrice, skuList = [] }) {
  const productBase = pickEffectiveRawPrice({
    price: productPrice,
  });
  const skuBase = pickLowestSkuRawPrice(skuList);

  return skuBase != null && skuBase > 0 ? skuBase : productBase;
}

export function buildPricingTiers(basePrice, rule) {
  if (!rule) return [];

  const tiers = [];

  const t1Val = rule.tier1_value ?? rule.tier1_margin ?? rule.margin_percent ?? rule.fixed_amount ?? rule.fixed_price ?? 50;
  const t1Type = rule.tier1_type || rule.pricing_type || "PERCENTAGE_MARGIN";
  tiers.push({
    key: "tier1",
    label: "MOQ",
    minQty: Math.max(1, toNumber(rule.tier1_min_qty, 1)),
    margin: toNumber(t1Val),
    calculationType: t1Type,
    unitPrice: calculateTierPrice(basePrice, t1Val, t1Type),
  });

  if (rule.tier2_min_qty != null && (rule.tier2_margin != null || rule.tier2_value != null)) {
    const t2Val = rule.tier2_value ?? rule.tier2_margin ?? 0;
    const t2Type = rule.tier2_type || rule.pricing_type || "PERCENTAGE_MARGIN";
    tiers.push({
      key: "tier2",
      label: "Volume",
      minQty: toNumber(rule.tier2_min_qty),
      margin: toNumber(t2Val),
      calculationType: t2Type,
      unitPrice: calculateTierPrice(basePrice, t2Val, t2Type),
    });
  }

  if (rule.tier3_min_qty != null && (rule.tier3_margin != null || rule.tier3_value != null)) {
    const t3Val = rule.tier3_value ?? rule.tier3_margin ?? 0;
    const t3Type = rule.tier3_type || rule.pricing_type || "PERCENTAGE_MARGIN";
    tiers.push({
      key: "tier3",
      label: "Bulk",
      minQty: toNumber(rule.tier3_min_qty),
      margin: toNumber(t3Val),
      calculationType: t3Type,
      unitPrice: calculateTierPrice(basePrice, t3Val, t3Type),
    });
  }

  return tiers.sort((a, b) => a.minQty - b.minQty);
}

export function getTierForQuantity(tiers = [], quantity = 1) {
  const qty = toNumber(quantity, 1);

  return [...tiers]
    .filter((tier) => qty >= toNumber(tier.minQty, 1))
    .sort((a, b) => toNumber(b.minQty) - toNumber(a.minQty))[0] || tiers[0] || null;
}

export function buildProductPricing({ basePrice, fallbackPrice, minOrderQuantity, rules = [], context = {} }) {
  const rule = findPricingRule(basePrice, rules, context);
  const tiers = buildPricingTiers(basePrice, rule);
  const fallback = Number(toNumber(fallbackPrice || basePrice).toFixed(2));
  const effectiveMinOrderQty = Math.max(
    toNumber(minOrderQuantity, 1),
    toNumber(tiers[0]?.minQty, 1)
  );

  return {
    ruleId: rule?.id || null,
    ruleName: rule?.name || (rule?.id ? `Rule #${rule.id}` : "Default Margin"),
    ruleSource: rule?.scope || "GLOBAL",
    basePrice: Number(toNumber(basePrice).toFixed(2)),
    minOrderQty: effectiveMinOrderQty,
    tiers,
    startingUnitPrice: tiers[0]?.unitPrice ?? fallback,
    bestUnitPrice: tiers.length ? tiers[tiers.length - 1].unitPrice : fallback,
  };
}

export function buildINRProductPricing({ rawPrice, INRRate, minOrderQuantity, rules = [], context = {} }) {
  const INRPrice = convertToINR(rawPrice, INRRate);

  return buildProductPricing({
    basePrice: INRPrice,
    fallbackPrice: INRPrice,
    minOrderQuantity,
    rules,
    context,
  });
}

export function applyPricingRules(basePrice, rules, customMinOrder = null, context = {}) {
  const pricing = buildProductPricing({
    basePrice,
    fallbackPrice: basePrice,
    minOrderQuantity: customMinOrder,
    rules,
    context,
  });

  return {
    finalPrice: pricing.startingUnitPrice,
    minOrder: pricing.minOrderQty,
    ruleId: pricing.ruleId,
    ruleName: pricing.ruleName,
    ruleSource: pricing.ruleSource,
    basePrice: pricing.basePrice,
    bestPrice: pricing.bestUnitPrice,
    tiers: pricing.tiers.map((tier) => ({
      ...tier,
      minQuantity: tier.minQty,
      price: tier.unitPrice,
    })),
  };
}

export async function getINRRate() {
  try {
    const setting = await prisma.settings.findFirst({
      where: { title: "inr_rate" },
    });
    return setting?.value ? Number(setting.value) : 1;
  } catch (error) {
    return 1;
  }
}

export function calculateProductINRSellingPrice(product, INRRate = 1, rules = []) {
  if (!product) return 0;

  if (product.custom_selling_price != null && Number(product.custom_selling_price) > 0) {
    return Number(Number(product.custom_selling_price).toFixed(2));
  }

  const rawPrice = pickEffectiveRawPrice({ price: product.price });
  const basePriceINR = rawPrice * Number(INRRate || 1);

  if (!rules || rules.length === 0) {
    return Number(basePriceINR.toFixed(2));
  }

  const pricingInfo = applyPricingRules(basePriceINR, rules, product.min_order_quantity, {
    categoryId: product.category_id || product.category?.id,
    shopName: product.shop_name,
    productId: product.id,
  });

  const finalPrice = pricingInfo?.finalPrice ?? basePriceINR;
  return Number(Number(finalPrice).toFixed(2));
}

export const calculateProductAEDSellingPrice = calculateProductINRSellingPrice;

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applyPricingRules, findPricingRule } from '@/utils/pricing';
import { formatVariantEnglish } from '@/utils/variantTranslation';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    const inrRateSetting = await prisma.settings.findFirst({
      where: { title: 'inr_rate' },
    });
    const inrRate = inrRateSetting?.value ? Number(inrRateSetting.value) : 1;

    const pricingRules = await prisma.pricingRule.findMany({
      orderBy: { max_price: 'asc' },
    });

    const where = {};
    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { en_title: { contains: query, mode: 'insensitive' } },
        { id: { contains: query, mode: 'insensitive' } }
      ];
    }

    const products = await prisma.productShop.findMany({
      where,
      take: limit,
      select: {
        id: true,
        title: true,
        en_title: true,
        price: true,
        promotion_price: true,
        min_order_quantity: true,
        main_image_url: true,
        main_image_s3: true,
        shipping_charge_air: true,
        shipping_charge_sea: true,
        productDetails: {
          select: {
            skuList: {
              select: {
                id: true,
                skuId: true,
                price: true,
                promotionPrice: true,
                picUrl: true,
                s3Url: true,
                properties: true
              }
            },
            multiLanguageInfos: {
              where: { language: 'en' },
              select: { data: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedProducts = products.map((p) => {
      // Extract & format variants (SKUs)
      const pd = p.productDetails;
      const englishProps = pd?.multiLanguageInfos?.[0]?.data?.properties || [];
      const rawSkuList = pd?.skuList || [];

      const variants = rawSkuList.map((sku, skuIdx) => {
        const variantName = formatVariantEnglish(sku.properties, englishProps) || `Variant ${skuIdx + 1}`;
        const skuCny = Number(sku.price || sku.promotionPrice || p.price || p.promotion_price || 0);
        const skuInr = Number((skuCny * inrRate).toFixed(2));
        const skuPricingInfo = applyPricingRules(skuInr, pricingRules, p.min_order_quantity);
        const skuRule = findPricingRule(skuInr, pricingRules);

        const skuTiers = (skuPricingInfo.tiers || []).map((t) => ({
          key: t.key || 'tier1',
          label: t.label || 'MOQ',
          minQty: t.minQty || t.minQuantity || 1,
          margin: t.margin || 0,
          unitPrice: Number((t.unitPrice || t.price || skuInr).toFixed(2))
        }));

        const skuUnitPrice = skuTiers[0]?.unitPrice ?? skuPricingInfo.finalPrice ?? skuInr;
        const skuImg = sku.s3Url || sku.picUrl || p.main_image_url || p.main_image_s3 || '';

        return {
          id: sku.id,
          skuId: sku.skuId || String(sku.id),
          name: variantName,
          base_cny: skuCny,
          base_inr: skuInr,
          price: skuUnitPrice,
          rule_name: skuRule ? `Rule #${skuRule.id} (Max ₹${skuRule.max_price})` : 'Default Margin',
          pricing_tiers: skuTiers,
          image: skuImg
        };
      });

      const firstVariant = variants.length > 0 ? variants[0] : null;
      const baseCny = firstVariant ? firstVariant.base_cny : Number(p.price || p.promotion_price || 0);
      const baseInr = firstVariant ? firstVariant.base_inr : Number((baseCny * inrRate).toFixed(2));
      const pricingInfo = firstVariant ? null : applyPricingRules(baseInr, pricingRules, p.min_order_quantity);
      const rule = findPricingRule(baseInr, pricingRules);
      const tiers = firstVariant ? firstVariant.pricing_tiers : (pricingInfo?.tiers || []).map((t) => ({
        key: t.key || 'tier1',
        label: t.label || 'MOQ',
        minQty: t.minQty || t.minQuantity || 1,
        margin: t.margin || 0,
        unitPrice: Number((t.unitPrice || t.price || baseInr).toFixed(2))
      }));

      const startingPrice = firstVariant ? firstVariant.price : (tiers[0]?.unitPrice ?? pricingInfo?.finalPrice ?? baseInr);

      return {
        id: p.id,
        title: p.en_title || p.title || `Product ${p.id}`,
        en_title: p.en_title || p.title || `Product ${p.id}`,
        raw_title: p.title || '',
        price: startingPrice,
        base_cny: baseCny,
        base_inr: baseInr,
        inr_rate: inrRate,
        min_order_quantity: p.min_order_quantity || tiers[0]?.minQty || 1,
        rule_id: rule?.id || null,
        rule_name: rule ? `Rule #${rule.id} (Max ₹${rule.max_price})` : 'Default Margin',
        pricing_tiers: tiers,
        variants,
        image: firstVariant?.image || p.main_image_url || p.main_image_s3 || '',
        shipping_charge_air: p.shipping_charge_air || 0,
        shipping_charge_sea: p.shipping_charge_sea || 0
      };
    });

    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error('Failed to fetch sales products catalog:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

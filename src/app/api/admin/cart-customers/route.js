import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { applyPricingRules } from "@/utils/pricing";
import { formatVariantEnglish } from "@/utils/variantTranslation";

// Helper to determine base price in CNY
const getCartItemBaseCny = (item) => (
  item?.sku?.price
  || item?.product?.price
  || item?.sku?.promotionPrice
  || item?.product?.promotion_price
  || item?.price
  || 0
);

// Helper to calculate pricing in INR
const getCartItemPricing = (item, inrRate, rules) => {
  const quantity = item?.quantity || 1;
  const baseCny = getCartItemBaseCny(item);
  const baseInr = baseCny * (inrRate || 1);
  const pricing = applyPricingRules(baseInr, rules || [], item?.product?.min_order_quantity);
  const tiers = pricing.tiers || [];
  const tier = [...tiers]
    .filter((t) => quantity >= (t.minQuantity || 1))
    .sort((a, b) => (b.minQuantity || 1) - (a.minQuantity || 1))[0] || tiers[0] || null;
  const unitPrice = tier?.price ?? pricing.finalPrice ?? baseInr;

  return {
    baseCny,
    baseInr,
    unitPrice,
    subtotal: unitPrice * quantity,
  };
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdStr = searchParams.get("userId");

    // Fetch INR Rate settings and active Pricing Rules
    const inrRateSetting = await prisma.settings.findFirst({
      where: { title: 'inr_rate' },
    });
    const inrRate = inrRateSetting?.value || 1;

    const pricingRules = await prisma.pricingRule.findMany({
      orderBy: { max_price: 'asc' },
    });

    // ─────────────────────────────────────────────────────────────────
    // CASE 1: Fetch details for a specific user's cart (View Cart details)
    // ─────────────────────────────────────────────────────────────────
    if (userIdStr) {
      const userId = parseInt(userIdStr, 10);
      if (isNaN(userId)) {
        return NextResponse.json({ error: "Invalid User ID" }, { status: 400 });
      }

      // Fetch User Details with orders and address summary
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          orders: {
            select: {
              id: true,
              orderNo: true,
              code: true,
              grand_total: true,
              delivery_status: true,
              created_at: true,
            },
            orderBy: { created_at: 'desc' }
          },
          addresses: true,
        }
      });

      const cartItems = await prisma.cart.findMany({
        where: { user_id: userId },
        orderBy: { updated_at: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              en_title: true,
              price: true,
              promotion_price: true,
              min_order_quantity: true,
              inventory: true,
              main_image_s3: true,
              main_image_url: true,
              shop_name: true,
              weight: true,
              measurement_type: true,
              shipping_weight: true,
              shipping_width: true,
              shipping_height: true,
              shipping_length: true,
              shipping_charge_sea: true,
              shipping_charge_air: true,
              origin_address: true,
              shipping_time_guarantee: true,
              slug: true,
              category_id: true,
              category: {
                select: { name: true }
              },
              productDetails: {
                select: {
                  multiLanguageInfos: {
                    where: { language: "en" },
                    select: { data: true }
                  }
                }
              }
            }
          },
          sku: {
            select: {
              id: true,
              productId: true,
              skuId: true,
              price: true,
              promotionPrice: true,
              s3Url: true,
              picUrl: true,
              weight: true,
              shipping_length: true,
              shipping_width: true,
              shipping_height: true,
              shipping_charge_sea: true,
              shipping_charge_air: true,
              measurement_type: true,
              properties: true,
              quantity: true,
            }
          }
        }
      });

      const totalSpent = user?.orders?.reduce((sum, o) => sum + (o.grand_total || 0), 0) || 0;
      const totalOrdersCount = user?.orders?.length || 0;

      const formattedCart = await Promise.all(cartItems.map(async (item) => {
        const pricing = getCartItemPricing(item, inrRate, pricingRules);
        const image = item.sku?.s3Url || item.sku?.picUrl || item.product?.main_image_s3 || item.product?.main_image_url || '';
        const name = item.product?.en_title || item.product?.title || 'Unnamed Product';
        const skuId = item.sku?.skuId || 'N/A';
        const categoryName = item.product?.category?.name || 'General';
        const brandName = 'PinstaShop';
        const supplierName = item.product?.shop_name || 'In-House Supplier';

        const stockAvailable = item.sku?.quantity ?? item.product?.inventory ?? 0;
        const stockStatus = stockAvailable > 5 ? 'In Stock' : stockAvailable > 0 ? 'Low Stock' : 'Out of Stock';

        // Query product_shipping_details table for matching shipping record
        const productIdStr = item.productId ? String(item.productId) : null;
        const skuIdStr = item.sku?.skuId ? String(item.sku.skuId) : null;
        const productDetailId = item.sku?.productId ? Number(item.sku.productId) : null;

        const orConditions = [];
        if (skuIdStr) orConditions.push({ skuId: skuIdStr });
        if (productIdStr) {
          orConditions.push({ productShopId: productIdStr });
          orConditions.push({ offerId: productIdStr });
        }
        if (productDetailId) orConditions.push({ productDetailId });

        let psdRecord = null;
        if (orConditions.length > 0) {
          psdRecord = await prisma.productShippingDetail.findFirst({
            where: { OR: orConditions },
            orderBy: { updatedAt: "desc" }
          });
        }

        const hasSkuWeight = item.sku?.weight != null && Number(item.sku?.weight) !== 0;
        const hasSkuDimensions = (item.sku?.shipping_length != null && Number(item.sku?.shipping_length) !== 0) ||
                                 (item.sku?.shipping_width != null && Number(item.sku?.shipping_width) !== 0) ||
                                 (item.sku?.shipping_height != null && Number(item.sku?.shipping_height) !== 0);
        const hasSkuSeaCharge = item.sku?.shipping_charge_sea != null && Number(item.sku?.shipping_charge_sea) !== 0;
        const hasSkuAirCharge = item.sku?.shipping_charge_air != null && Number(item.sku?.shipping_charge_air) !== 0;

        // Auto-store record in product_shipping_details if not already present
        if (!psdRecord) {
          const sourceTable = hasSkuWeight || hasSkuDimensions
            ? "PRODUCT_SKU_LIST"
            : (item.product?.productDetails ? "PRODUCTDETAIL" : "PRODUCTSHOP");

          const fallbackWeight = hasSkuWeight ? Number(item.sku.weight) : Number(item.product?.weight ?? item.product?.shipping_weight ?? 0);
          const fallbackLength = hasSkuDimensions ? Number(item.sku.shipping_length) : Number(item.product?.shipping_length ?? 0);
          const fallbackWidth = hasSkuDimensions ? Number(item.sku.shipping_width) : Number(item.product?.shipping_width ?? 0);
          const fallbackHeight = hasSkuDimensions ? Number(item.sku.shipping_height) : Number(item.product?.shipping_height ?? 0);
          const fallbackMeasType = item.sku?.measurement_type || item.product?.measurement_type || "GRAM";

          const fallbackSeaCharge = item.sku?.shipping_charge_sea ?? item.product?.shipping_charge_sea ?? 0;
          const fallbackAirCharge = item.sku?.shipping_charge_air ?? item.product?.shipping_charge_air ?? 0;

          try {
            psdRecord = await prisma.productShippingDetail.create({
              data: {
                source_table: sourceTable,
                productShopId: productIdStr,
                productDetailId: productDetailId,
                skuId: skuIdStr,
                offerId: productIdStr,
                weight: fallbackWeight,
                length: fallbackLength,
                width: fallbackWidth,
                height: fallbackHeight,
                measurement_type: fallbackMeasType,
                shipping_charge_sea: Number(fallbackSeaCharge),
                shipping_charge_air: Number(fallbackAirCharge),
                sendGoodsAddressText: item.product?.origin_address || null,
                skuProperties: item.sku?.properties || null,
                price: Number(item.sku?.price || item.product?.price || 0),
                promotionPrice: Number(item.sku?.promotionPrice || item.product?.promotion_price || 0),
                quantity: Number(item.sku?.quantity || item.product?.inventory || 0),
              }
            });
          } catch (err) {
            console.warn("Auto-storing product_shipping_details failed:", err?.message || err);
          }
        }

        const shippingDetailsTable = "product_shipping_details";
        const shippingDetailsSourceTable = psdRecord?.source_table || (hasSkuWeight || hasSkuDimensions ? "PRODUCT_SKU_LIST" : "PRODUCTSHOP");

        const weight = psdRecord?.weight ?? (hasSkuWeight ? item.sku.weight : (item.product?.weight ?? item.product?.shipping_weight ?? 0));
        const length = psdRecord?.length ?? (hasSkuDimensions ? item.sku.shipping_length : (item.product?.shipping_length ?? 0));
        const width = psdRecord?.width ?? (hasSkuDimensions ? item.sku.shipping_width : (item.product?.shipping_width ?? 0));
        const height = psdRecord?.height ?? (hasSkuDimensions ? item.sku.shipping_height : (item.product?.shipping_height ?? 0));
        const measurementType = psdRecord?.measurement_type || item.sku?.measurement_type || item.product?.measurement_type || 'GRAM';

        const shippingChargeSea = psdRecord?.shipping_charge_sea ?? (hasSkuSeaCharge ? item.sku.shipping_charge_sea : (item.product?.shipping_charge_sea ?? 0));
        const shippingChargeAir = psdRecord?.shipping_charge_air ?? (hasSkuAirCharge ? item.sku.shipping_charge_air : (item.product?.shipping_charge_air ?? 0));

        const title = item.product?.title || null;
        const en_title = item.product?.en_title || null;
        const product_weight = item.product?.weight ?? item.product?.shipping_weight ?? null;
        const productSku_weight = item.sku?.weight ?? null;

        const englishProps = item.product?.productDetails?.multiLanguageInfos?.[0]?.data?.properties || [];
        const rawVariation = item.variation || item.sku?.properties || null;
        const englishVariationName = formatVariantEnglish(rawVariation, englishProps);

        return {
          id: item.id,
          productId: item.productId,
          productSkuId: item.productSkuId,
          name,
          title,
          en_title,
          sku: skuId,
          image,
          price: pricing.unitPrice,
          quantity: item.quantity,
          total: pricing.subtotal,
          baseCny: pricing.baseCny,
          baseInr: pricing.baseInr,
          variation: rawVariation,
          variation_name: englishVariationName || null,
          category: categoryName,
          brand: brandName,
          supplier: supplierName,
          warehouse: 'Main Warehouse',
          stockStatus,
          availableStock: stockAvailable,
          reservedStock: 0,
          minOrderQuantity: item.product?.min_order_quantity || 1,
          maxOrderQuantity: stockAvailable || 9999,
          
          // Shipping & Package details fields
          shippingDetailsTable,
          shippingDetailsSourceTable,
          shippingDetailId: psdRecord?.id || null,
          weight,
          weightSource: `${shippingDetailsTable} (${shippingDetailsSourceTable})`,
          product_weight,
          productSku_weight,
          skuWeight: productSku_weight,
          measurementType,
          length,
          width,
          height,
          packageSource: `${shippingDetailsTable} (${shippingDetailsSourceTable})`,
          shipping_charge_sea: shippingChargeSea,
          shipping_charge_air: shippingChargeAir,
          shippingChargeSource: `${shippingDetailsTable} (${shippingDetailsSourceTable})`,

          // Extended attributes from product_shipping_details
          officialWeight: psdRecord?.officialWeight ?? null,
          officialLength: psdRecord?.officialLength ?? null,
          officialWidth: psdRecord?.officialWidth ?? null,
          officialHeight: psdRecord?.officialHeight ?? null,
          pkgSizeSource: psdRecord?.pkgSizeSource ?? null,
          aiWeight: psdRecord?.aiWeight ?? null,
          aiWeightAccuracy: psdRecord?.aiWeightAccuracy ?? null,
          sendGoodsAddressText: psdRecord?.sendGoodsAddressText ?? item.product?.origin_address ?? null,
          postFee: psdRecord?.postFee ?? 0,
          productCargoNumber: psdRecord?.productCargoNumber ?? null,
          unit: psdRecord?.unit ?? null,

          // Full multi-table breakdown audit object across product_shipping_details, product_sku_list, productdetail, productshop
          tablesBreakdown: {
            product_shipping_details: psdRecord ? {
              id: psdRecord.id,
              source_table: psdRecord.source_table,
              weight: psdRecord.weight ?? 0,
              length: psdRecord.length ?? 0,
              width: psdRecord.width ?? 0,
              height: psdRecord.height ?? 0,
              measurementType: psdRecord.measurement_type || 'GRAM',
              shipping_charge_sea: psdRecord.shipping_charge_sea ?? 0,
              shipping_charge_air: psdRecord.shipping_charge_air ?? 0,
              officialWeight: psdRecord.officialWeight ?? null,
              officialLength: psdRecord.officialLength ?? null,
              officialWidth: psdRecord.officialWidth ?? null,
              officialHeight: psdRecord.officialHeight ?? null,
              pkgSizeSource: psdRecord.pkgSizeSource ?? null,
              aiWeight: psdRecord.aiWeight ?? null,
              aiWeightAccuracy: psdRecord.aiWeightAccuracy ?? null,
              postFee: psdRecord.postFee ?? 0,
              sendGoodsAddressText: psdRecord.sendGoodsAddressText ?? null,
              productCargoNumber: psdRecord.productCargoNumber ?? null,
              unit: psdRecord.unit ?? null
            } : null,

            product_sku_list: item.sku ? {
              id: item.sku.id,
              skuId: item.sku.skuId || 'N/A',
              weight: item.sku.weight ?? 0,
              length: item.sku.shipping_length ?? 0,
              width: item.sku.shipping_width ?? 0,
              height: item.sku.shipping_height ?? 0,
              measurementType: item.sku.measurement_type || 'GRAM',
              shipping_charge_sea: item.sku.shipping_charge_sea ?? 0,
              shipping_charge_air: item.sku.shipping_charge_air ?? 0
            } : null,

            productdetail: {
              id: item.sku?.productId || null,
              itemId: item.productId,
              officialWeight: psdRecord?.officialWeight ?? null,
              pkgSizeSource: psdRecord?.pkgSizeSource ?? null,
              postFee: psdRecord?.postFee ?? 0,
              unit: psdRecord?.unit ?? null
            },

            productshop: item.product ? {
              id: item.product.id,
              weight: item.product.weight ?? 0,
              shipping_weight: item.product.shipping_weight ?? 0,
              length: item.product.shipping_length ?? 0,
              width: item.product.shipping_width ?? 0,
              height: item.product.shipping_height ?? 0,
              measurementType: item.product.measurement_type || 'GRAM',
              shipping_charge_sea: item.product.shipping_charge_sea ?? 0,
              shipping_charge_air: item.product.shipping_charge_air ?? 0,
              origin_address: item.product.origin_address ?? null,
              shipping_time_guarantee: item.product.shipping_time_guarantee ?? null
            } : null
          },

          slug: item.product?.slug || '',
          createdAt: item.created_at,
          updatedAt: item.updated_at
        };
      }));

      const customerObj = {
        id: user?.id || userId,
        name: user?.name || 'Unnamed Customer',
        email: user?.email || 'N/A',
        phone: user?.phone || 'N/A',
        user_type: user?.user_type || 'customer',
        created_at: user?.created_at,
        updated_at: user?.updated_at,
        banned: user?.banned || false,
        address: user?.address || user?.addresses?.[0]?.address || '—',
        city: user?.city || user?.addresses?.[0]?.city || '—',
        state: user?.state || user?.addresses?.[0]?.state || '—',
        country: user?.country || user?.addresses?.[0]?.country || 'India',
        postalCode: user?.postal_code || user?.addresses?.[0]?.postal_code || '—',
        businessName: user?.name ? `${user.name} Trading` : 'N/A',
        customerGroup: 'Wholesale Buyer',
        gstNumber: 'GSTIN27AABCU9603R1ZM',
        totalOrders: totalOrdersCount,
        lifetimePurchase: totalSpent,
        accountStatus: user?.banned ? 'Banned' : 'Active'
      };

      return NextResponse.json({
        customer: customerObj,
        cart: formattedCart,
        inrRate,
        pricingRules
      }, { status: 200 });
    }

    // ─────────────────────────────────────────────────────────────────
    // CASE 2: Paginated List and Summary Statistics
    // ─────────────────────────────────────────────────────────────────
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    // A. Gather summary statistics across all registered customer carts
    // Find all distinct user_ids with active carts
    const activeCartsGroups = await prisma.cart.groupBy({
      by: ['user_id'],
    });
    const allActiveUserIds = activeCartsGroups.map(g => g.user_id).filter(Boolean);

    // Fetch customer type users who have items in the cart
    const customerUsersWithCart = await prisma.user.findMany({
      where: {
        id: { in: allActiveUserIds },
        user_type: 'customer',
      },
      select: { id: true }
    });
    const activeCustomerUserIds = customerUsersWithCart.map(u => u.id);

    // Total Customers (registered users with type = customer)
    const totalCustomers = await prisma.user.count({
      where: { user_type: 'customer' }
    });

    // Customers with Active Cart
    const activeCartCustomersCount = activeCustomerUserIds.length;

    // Fetch all active cart items for registered customers to calculate total value and total items
    const allActiveCartItems = await prisma.cart.findMany({
      where: {
        user_id: { in: activeCustomerUserIds }
      },
      select: {
        quantity: true,
        productId: true,
        productSkuId: true,
        product: {
          select: {
            price: true,
            promotion_price: true,
            min_order_quantity: true,
          }
        },
        sku: {
          select: {
            price: true,
            promotionPrice: true,
          }
        }
      }
    });

    let totalCartItems = 0;
    let totalCartValue = 0;

    allActiveCartItems.forEach(item => {
      const pricing = getCartItemPricing(item, inrRate, pricingRules);
      totalCartItems += item.quantity;
      totalCartValue += pricing.subtotal;
    });

    // B. Build the paginated and searched customer list
    // Get all user_id and max updated_at, sorted by max updated_at desc
    const sortedCartsGroups = await prisma.cart.groupBy({
      by: ['user_id'],
      _max: {
        updated_at: true
      },
      orderBy: {
        _max: {
          updated_at: 'desc'
        }
      }
    });

    let orderedActiveUserIds = sortedCartsGroups.map(g => g.user_id).filter(Boolean);

    // Apply search filter if active
    let filteredUserIds = [];
    if (search) {
      const matchedUsers = await prisma.user.findMany({
        where: {
          user_type: "customer",
          id: { in: orderedActiveUserIds },
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } }
          ]
        },
        select: { id: true }
      });
      const matchedSet = new Set(matchedUsers.map(u => u.id));
      filteredUserIds = orderedActiveUserIds.filter(id => matchedSet.has(id));
    } else {
      const customerUserSet = new Set(activeCustomerUserIds);
      filteredUserIds = orderedActiveUserIds.filter(id => customerUserSet.has(id));
    }

    const totalFilteredCount = filteredUserIds.length;
    const paginatedUserIds = filteredUserIds.slice(skip, skip + limit);

    // Fetch detailed user info for the page
    const pageUsers = await prisma.user.findMany({
      where: {
        id: { in: paginatedUserIds }
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        whatsapp_number: true,
        city: true,
        country: true,
        avatar: true,
      }
    });
    const usersMap = new Map(pageUsers.map(u => [u.id, u]));

    // Fetch cart items for the page users to calculate page-level details
    const pageCartItems = await prisma.cart.findMany({
      where: {
        user_id: { in: paginatedUserIds }
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            en_title: true,
            main_image_url: true,
            main_image_s3: true,
            price: true,
            promotion_price: true,
            min_order_quantity: true,
          }
        },
        sku: {
          select: {
            id: true,
            picUrl: true,
            s3Url: true,
            price: true,
            promotionPrice: true,
          }
        }
      }
    });

    // Map each paginated user to their cart statistics
    const customersList = paginatedUserIds.map(userId => {
      const user = usersMap.get(userId);
      if (!user) return null;

      const userCartItems = pageCartItems.filter(item => item.user_id === userId);
      const numCartItems = userCartItems.length;
      const totalQuantity = userCartItems.reduce((sum, item) => sum + item.quantity, 0);
      const cartValue = userCartItems.reduce((sum, item) => {
        const pricing = getCartItemPricing(item, inrRate, pricingRules);
        return sum + pricing.subtotal;
      }, 0);

      const lastUpdated = userCartItems.reduce((max, item) => {
        return item.updated_at > max ? item.updated_at : max;
      }, new Date(0));

      const itemsPreview = userCartItems.map(item => {
        const itemImage =
          item.image ||
          item.sku?.s3Url ||
          item.sku?.picUrl ||
          item.product?.main_image_s3 ||
          item.product?.main_image_url ||
          '';

        return {
          id: item.id,
          productId: item.productId,
          title: item.product?.title || item.product?.en_title || 'Unnamed Product',
          image: itemImage,
          price: item.price || item.product?.price || 0,
          quantity: item.quantity || 1,
        };
      });

      return {
        id: user.id,
        userId: user.id,
        name: user.name || `Customer #${user.id}`,
        email: user.email || null,
        phone: user.phone || user.whatsapp_number || null,
        whatsapp_number: user.whatsapp_number || null,
        city: user.city || null,
        country: user.country || null,
        avatar: user.avatar || null,
        numCartItems,
        totalItems: numCartItems,
        totalQuantity,
        cartValue,
        totalValue: cartValue,
        lastUpdated,
        user: {
          id: user.id,
          name: user.name || `Customer #${user.id}`,
          email: user.email || null,
          phone: user.phone || user.whatsapp_number || null,
          whatsapp_number: user.whatsapp_number || null,
          city: user.city || null,
          country: user.country || null,
          avatar: user.avatar || null,
        },
        items: itemsPreview,
      };
    }).filter(Boolean);

    return NextResponse.json({
      summary: {
        totalCustomers,
        activeCartCustomers: activeCartCustomersCount,
        totalCartItems,
        totalCartValue,
      },
      customers: customersList,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalFilteredCount / limit),
        totalCount: totalFilteredCount,
      }
    }, { status: 200 });

  } catch (error) {
    console.error("Failed to fetch cart customers:", error);
    return NextResponse.json({ error: "Failed to fetch cart customers" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    let userIdStr = searchParams.get("userId");

    if (!userIdStr) {
      const body = await request.json().catch(() => ({}));
      userIdStr = body.userId;
    }

    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid User ID" }, { status: 400 });
    }

    await prisma.cart.deleteMany({
      where: { user_id: userId }
    });

    return NextResponse.json({ success: true, message: "Cart cleared successfully" }, { status: 200 });
  } catch (error) {
    console.error("Failed to clear customer cart:", error);
    return NextResponse.json({ error: "Failed to clear customer cart" }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const customerId = parseInt(id, 10);

    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 });
    }

    // 1. Fetch user profile
    const user = await prisma.user.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        whatsapp_number: true,
        address: true,
        city: true,
        country: true,
        banned: true,
        created_at: true,
        _count: {
          select: { orders: true },
        },
      },
    });

    // 2. Fetch cart items for this customer
    const cartItems = await prisma.cart.findMany({
      where: {
        OR: [{ user_id: customerId }, { temp_user_id: customerId }],
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
            slug: true,
          },
        },
        sku: {
          select: {
            id: true,
            picUrl: true,
            s3Url: true,
            price: true,
            properties: true,
          },
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    const items = cartItems.map((item) => {
      const unitPrice = item.price || item.product?.price || 0;
      const quantity = item.quantity || 1;
      const subtotal = unitPrice * quantity;
      const image =
        item.image ||
        item.sku?.s3Url ||
        item.sku?.picUrl ||
        item.product?.main_image_s3 ||
        item.product?.main_image_url ||
        '';

      return {
        id: item.id,
        productId: item.productId,
        productSkuId: item.productSkuId,
        title: item.product?.title || item.product?.en_title || 'Unnamed Product',
        slug: item.product?.slug || '',
        image,
        price: unitPrice,
        quantity,
        subtotal,
        variation: item.variation || item.sku?.properties || null,
        updatedAt: item.updated_at || item.created_at,
      };
    });

    const totalItems = items.reduce((acc, i) => acc + i.quantity, 0);
    const totalValue = items.reduce((acc, i) => acc + i.subtotal, 0);
    const lastUpdated = items.length > 0 ? items[0].updatedAt : null;

    return NextResponse.json({
      customer: user || {
        id: customerId,
        name: `Customer #${customerId}`,
        email: null,
        phone: null,
      },
      cart: {
        totalItems,
        totalValue,
        lastUpdated,
        items,
      },
    });
  } catch (error) {
    console.error('Failed to fetch customer cart details:', error);
    return NextResponse.json({ error: 'Failed to fetch customer cart details' }, { status: 500 });
  }
}

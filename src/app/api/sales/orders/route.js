import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const where = {};
    if (status && status !== 'all') {
      where.delivery_status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        orderDetails: true,
      }
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Failed to fetch sales orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const { orderId, delivery_status, payment_status } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const updateData = {};
    if (delivery_status) updateData.delivery_status = delivery_status;
    if (payment_status) updateData.payment_status = payment_status;

    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(orderId, 10) },
      data: updateData,
    });

    return NextResponse.json({ message: 'Order updated successfully', order: updatedOrder });
  } catch (error) {
    console.error('Failed to update order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}


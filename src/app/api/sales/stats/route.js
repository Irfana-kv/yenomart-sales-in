import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [totalOrders, pendingOrders, totalCustomers, totalRevenueData, recentOrders] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { delivery_status: 'pending' } }),
      prisma.user.count({ where: { user_type: 'customer' } }),
      prisma.order.aggregate({ _sum: { grand_total: true } }),
      prisma.order.findMany({
        take: 8,
        orderBy: { created_at: 'desc' },
        include: { user: { select: { id: true, name: true, email: true, phone: true } } }
      })
    ]);

    return NextResponse.json({
      totalOrders,
      pendingOrders,
      totalCustomers,
      totalRevenue: totalRevenueData._sum.grand_total || 0,
      recentOrders
    });
  } catch (error) {
    console.error('Failed to fetch sales stats:', error);
    return NextResponse.json({ error: 'Failed to fetch sales dashboard data.' }, { status: 500 });
  }
}


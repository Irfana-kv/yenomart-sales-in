import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const customers = await prisma.user.findMany({
      where: { user_type: 'customer' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        country: true,
        banned: true,
        created_at: true,
        _count: { select: { orders: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json(customers);
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customer list' }, { status: 500 });
  }
}


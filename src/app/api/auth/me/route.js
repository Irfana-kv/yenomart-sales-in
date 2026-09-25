import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'yenomart_sales_jwt_secret_2026';

export async function GET(req) {
  try {
    const token = req.cookies.get('sales_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, phone: true, user_type: true, created_at: true }
    });

    if (!user || user.user_type !== 'sales') {
      return NextResponse.json({ error: 'Unauthorized sales account' }, { status: 403 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }
}


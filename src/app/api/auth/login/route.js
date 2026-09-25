import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'yenomart_sales_jwt_secret_2026';

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    if (user.banned) {
      return NextResponse.json({ error: 'Account is suspended/banned.' }, { status: 403 });
    }

    // Enforce Sales user authorization
    if (user.user_type !== 'sales') {
      return NextResponse.json({ error: 'Access Denied: Only authorized Sales Users can log into the Sales Dashboard.' }, { status: 403 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, user_type: user.user_type },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const response = NextResponse.json({ message: 'Login successful.', user: { id: user.id, name: user.name, email: user.email, user_type: user.user_type } });
    response.cookies.set('sales_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('Sales login error:', error);
    return NextResponse.json({ error: 'Something went wrong during login.' }, { status: 500 });
  }
}


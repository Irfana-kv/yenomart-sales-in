import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ message: 'Logged out successfully.' });
  response.cookies.set('sales_token', '', {
    httpOnly: true,
    path: '/',
    expires: new Date(0),
  });
  return response;
}


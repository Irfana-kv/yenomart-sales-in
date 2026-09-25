import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'yenomart_sales_jwt_secret_2026';

function getLoggedInUser(request) {
  try {
    let token = request.cookies.get('sales_token')?.value;
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded || null;
    }
  } catch (err) {}
  return null;
}

export async function GET(request) {
  try {
    const currentUser = getLoggedInUser(request);
    const isAdmin = currentUser?.user_type === 'admin' || currentUser?.user_type === 'superadmin';

    let leadWhere = '';
    const leadParams = [];
    if (!isAdmin && currentUser?.id) {
      leadWhere = 'WHERE created_by_id = $1';
      leadParams.push(currentUser.id);
    }

    // Fetch lead stats
    const totalLeadsRes = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM sales_leads ${leadWhere}`,
      ...leadParams
    ).catch(() => [{ count: 0 }]);

    const pipelineValRes = await prisma.$queryRawUnsafe(
      `SELECT COALESCE(SUM(total_price), 0)::float as val FROM sales_leads ${leadWhere ? leadWhere + " AND status NOT IN ('Lost', 'Converted')" : "WHERE status NOT IN ('Lost', 'Converted')"}`,
      ...leadParams
    ).catch(() => [{ val: 0 }]);

    const convertedValRes = await prisma.$queryRawUnsafe(
      `SELECT COALESCE(SUM(total_price), 0)::float as val FROM sales_leads ${leadWhere ? leadWhere + " AND status = 'Converted'" : "WHERE status = 'Converted'"}`,
      ...leadParams
    ).catch(() => [{ val: 0 }]);

    const totalUnitsRes = await prisma.$queryRawUnsafe(
      `SELECT COALESCE(SUM(quantity), 0)::int as count FROM sales_leads ${leadWhere}`,
      ...leadParams
    ).catch(() => [{ count: 0 }]);

    // Fetch active cart customers count
    const cartCustRes = await prisma.$queryRawUnsafe(
      `SELECT COUNT(DISTINCT user_id)::int as count FROM "Cart" WHERE user_id IS NOT NULL`
    ).catch(() => [{ count: 0 }]);

    // Fetch recent leads for dashboard list
    const recentLeads = await prisma.$queryRawUnsafe(
      `SELECT id, customer_name, email, phone, quantity, shipping_type, total_price, status, created_at
       FROM sales_leads ${leadWhere} ORDER BY created_at DESC LIMIT 6`,
      ...leadParams
    ).catch(() => []);

    return NextResponse.json({
      totalLeads: totalLeadsRes[0]?.count || 0,
      pipelineValue: pipelineValRes[0]?.val || 0,
      convertedValue: convertedValRes[0]?.val || 0,
      totalUnits: totalUnitsRes[0]?.count || 0,
      activeCartCustomers: cartCustRes[0]?.count || 0,
      recentLeads: Array.isArray(recentLeads) ? recentLeads : []
    });
  } catch (error) {
    console.error('Failed to fetch sales stats:', error);
    return NextResponse.json({ error: 'Failed to fetch sales dashboard data.' }, { status: 500 });
  }
}

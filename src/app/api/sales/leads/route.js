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
      return decoded || null; // { id, email, name, user_type }
    }
  } catch (err) {}
  return null;
}

// Sync lead items to customer cart
async function syncLeadToCustomerCart(leadId, userId, creatorId, itemsToSave) {
  if (!userId || isNaN(parseInt(userId, 10))) return;
  const customerId = parseInt(userId, 10);
  const leadIdNum = parseInt(leadId, 10);
  const creatorIdNum = creatorId ? parseInt(creatorId, 10) : null;

  try {
    // Clear existing cart items from this specific lead
    await prisma.$executeRawUnsafe(
      `DELETE FROM "Cart" WHERE user_id = $1 AND lead_id = $2`,
      customerId,
      leadIdNum
    );

    // Insert lead items into customer cart
    for (const item of itemsToSave) {
      if (!item.product_id) continue;
      const itemQty = parseInt(item.quantity || '1', 10);
      let itemPrice = parseFloat(item.unit_price || '0');
      if ((isNaN(itemPrice) || itemPrice <= 0) && item.total_price !== undefined && item.total_price !== null && parseFloat(item.total_price) > 0) {
        itemPrice = parseFloat(item.total_price) / itemQty;
      }

      await prisma.$executeRawUnsafe(
        `INSERT INTO "Cart" (user_id, "productId", "productSkuId", price, quantity, image, is_from_lead, lead_id, created_by_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, NOW(), NOW())`,
        customerId,
        String(item.product_id),
        item.product_sku_id ? parseInt(item.product_sku_id, 10) : null,
        itemPrice,
        itemQty,
        item.product_image || null,
        leadIdNum,
        creatorIdNum
      );
    }
  } catch (err) {
    console.error('Failed to sync lead items to customer cart:', err);
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const filterSalesRepId = searchParams.get('sales_rep_id');

    const currentUser = getLoggedInUser(request);

    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated', leads: [] }, { status: 401 });
    }

    const isAdmin = currentUser?.user_type === 'admin' || currentUser?.user_type === 'superadmin';

    if (id) {
      const leadIdNum = parseInt(id, 10);
      const leads = await prisma.$queryRawUnsafe(
        `SELECT id, user_id, created_by_id, customer_name, email, phone, quantity, shipping_type, total_price, status, lead_type, priority, follow_up_date, notes, created_at, updated_at
         FROM sales_leads WHERE id = $1`,
        leadIdNum
      );

      if (!Array.isArray(leads) || leads.length === 0) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      }

      const lead = leads[0];

      // Role check: Sales person can ONLY view their own lead
      if (!isAdmin && lead.created_by_id && lead.created_by_id !== currentUser.id) {
        return NextResponse.json({ error: 'Access Denied: You do not have permission to view this lead.' }, { status: 403 });
      }

      // Fetch user and creator info
      const userIds = [lead.user_id, lead.created_by_id].filter(Boolean);
      if (userIds.length > 0) {
        const users = await prisma.$queryRawUnsafe(
          `SELECT id, name, email, phone, user_type FROM "User" WHERE id = ANY($1::int[])`,
          userIds
        ).catch(() => []);
        const userMap = new Map((Array.isArray(users) ? users : []).map((u) => [u.id, u]));

        lead.user = lead.user_id ? (userMap.get(lead.user_id) || null) : null;
        lead.creator = lead.created_by_id ? (userMap.get(lead.created_by_id) || null) : null;
      } else {
        lead.user = null;
        lead.creator = null;
      }

      // Fetch items
      const items = await prisma.$queryRawUnsafe(
        `SELECT id, lead_id, product_id, product_sku_id, product_name, product_image, size, quantity, unit_price, total_price, created_at, updated_at
         FROM sales_lead_items WHERE lead_id = $1 ORDER BY id ASC`,
        leadIdNum
      ).catch(() => []);
      lead.items = Array.isArray(items) ? items : [];

      return NextResponse.json({ lead }, { status: 200 });
    }

    // Build WHERE clause with Strict Role Scoping:
    // Admin -> Can view ALL leads (or filter by specific sales_rep_id)
    // Sales Person -> Can ONLY view leads created by them (created_by_id = currentUser.id)
    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (isAdmin) {
      if (filterSalesRepId && !isNaN(parseInt(filterSalesRepId, 10))) {
        conditions.push(`created_by_id = $${paramIdx}`);
        params.push(parseInt(filterSalesRepId, 10));
        paramIdx++;
      }
    } else {
      // Sales person strictly sees only their leads
      conditions.push(`created_by_id = $${paramIdx}`);
      params.push(currentUser.id);
      paramIdx++;
    }

    if (search) {
      conditions.push(`(customer_name ILIKE $${paramIdx} OR email ILIKE $${paramIdx} OR phone ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (status && status !== 'All') {
      conditions.push(`status = $${paramIdx}`);
      params.push(status);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const leads = await prisma.$queryRawUnsafe(
      `SELECT id, user_id, created_by_id, customer_name, email, phone, quantity, shipping_type, total_price, status, lead_type, priority, follow_up_date, notes, created_at, updated_at
       FROM sales_leads ${whereClause} ORDER BY created_at DESC`,
      ...params
    );

    const safeLeads = Array.isArray(leads) ? leads : [];

    const allUserIds = Array.from(
      new Set([
        ...safeLeads.map((l) => l.user_id).filter(Boolean),
        ...safeLeads.map((l) => l.created_by_id).filter(Boolean),
      ])
    );

    let userMap = new Map();
    if (allUserIds.length > 0) {
      const users = await prisma.$queryRawUnsafe(
        `SELECT id, name, email, phone, user_type FROM "User" WHERE id = ANY($1::int[])`,
        allUserIds
      ).catch(() => []);
      userMap = new Map((Array.isArray(users) ? users : []).map((u) => [u.id, u]));
    }

    const leadIds = safeLeads.map((l) => l.id);
    let itemsMap = new Map();
    if (leadIds.length > 0) {
      const allItems = await prisma.$queryRawUnsafe(
        `SELECT id, lead_id, product_id, product_sku_id, product_name, product_image, size, quantity, unit_price, total_price, created_at, updated_at
         FROM sales_lead_items WHERE lead_id = ANY($1::int[]) ORDER BY id ASC`,
        leadIds
      ).catch(() => []);

      if (Array.isArray(allItems)) {
        allItems.forEach((it) => {
          if (!itemsMap.has(it.lead_id)) itemsMap.set(it.lead_id, []);
          itemsMap.get(it.lead_id).push(it);
        });
      }
    }

    safeLeads.forEach((lead) => {
      lead.user = lead.user_id ? (userMap.get(lead.user_id) || null) : null;
      lead.creator = lead.created_by_id ? (userMap.get(lead.created_by_id) || null) : null;
      lead.items = itemsMap.get(lead.id) || [];
    });

    const totalLeads = safeLeads.length;
    const pipelineValue = safeLeads
      .filter((l) => l.status !== 'Lost' && l.status !== 'Converted')
      .reduce((sum, l) => sum + (parseFloat(l.total_price) || 0), 0);
    const convertedValue = safeLeads
      .filter((l) => l.status === 'Converted')
      .reduce((sum, l) => sum + (parseFloat(l.total_price) || 0), 0);
    const totalUnits = safeLeads
      .reduce((sum, l) => sum + (parseInt(l.quantity || '0', 10) || 0), 0);

    const summary = {
      totalLeads,
      pipelineValue,
      convertedValue,
      totalUnits
    };

    return NextResponse.json({ leads: safeLeads, summary }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch sales leads:', error);
    return NextResponse.json({ error: 'Failed to fetch sales leads', details: error?.message || String(error) }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const {
      user_id,
      created_by_id,
      customer_name,
      email,
      phone,
      product_id,
      product_sku_id,
      product_name,
      product_image,
      size,
      quantity,
      unit_price,
      shipping_type,
      lead_type,
      priority,
      follow_up_date,
      notes,
      status
    } = body;

    if (!customer_name) {
      return NextResponse.json(
        { error: 'Customer name is required.' },
        { status: 400 }
      );
    }

    const currentUser = getLoggedInUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required to create a lead.' }, { status: 401 });
    }

    const creatorId = created_by_id ? parseInt(created_by_id, 10) : currentUser.id;

    let itemsToSave = [];
    if (Array.isArray(body.items) && body.items.length > 0) {
      itemsToSave = body.items.filter((it) => it.product_name && it.product_name.trim());
    }

    if (itemsToSave.length === 0 && product_name) {
      itemsToSave = [{
        product_id: product_id || null,
        product_sku_id: product_sku_id ? parseInt(product_sku_id, 10) : null,
        product_name,
        product_image: product_image || null,
        size: size || null,
        quantity: parseInt(quantity || '1', 10),
        unit_price: parseFloat(unit_price || '0'),
        total_price: body.total_price !== undefined && body.total_price !== null && body.total_price !== ''
          ? parseFloat(body.total_price)
          : (parseInt(quantity || '1', 10) * parseFloat(unit_price || '0'))
      }];
    }

    if (itemsToSave.length === 0) {
      return NextResponse.json({ error: 'At least one product item is required.' }, { status: 400 });
    }

    const prodIds = Array.from(new Set(itemsToSave.map((it) => it.product_id).filter(Boolean)));
    if (prodIds.length > 0) {
      const prods = await prisma.productShop.findMany({
        where: { id: { in: prodIds } },
        select: { id: true, en_title: true, title: true }
      }).catch(() => []);
      const prodMap = new Map(prods.map((p) => [p.id, p]));

      itemsToSave.forEach((it) => {
        if (it.product_id && prodMap.has(it.product_id)) {
          const p = prodMap.get(it.product_id);
          if (p.en_title && (!it.product_name || it.product_name === p.title)) {
            it.product_name = p.en_title;
          }
        }
      });
    }

    const totalUnits = itemsToSave.reduce((sum, it) => sum + (parseInt(it.quantity || '1', 10) || 1), 0);
    const autoCalculatedTotal = itemsToSave.reduce((sum, it) => {
      const q = parseInt(it.quantity || '1', 10);
      const u = parseFloat(it.unit_price || '0');
      const itemTot = it.total_price !== undefined && it.total_price !== null && it.total_price !== ''
        ? parseFloat(it.total_price)
        : (q * u);
      return sum + itemTot;
    }, 0);

    const overallTotal = body.total_price !== undefined && body.total_price !== null && body.total_price !== ''
      ? parseFloat(body.total_price)
      : autoCalculatedTotal;

    const insertedLeads = await prisma.$queryRawUnsafe(
      `INSERT INTO sales_leads (user_id, created_by_id, customer_name, email, phone, quantity, shipping_type, total_price, status, lead_type, priority, follow_up_date, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
       RETURNING *`,
      user_id ? parseInt(user_id, 10) : null,
      creatorId,
      customer_name,
      email || null,
      phone || null,
      totalUnits,
      shipping_type || 'Air',
      overallTotal,
      status || 'New',
      lead_type || 'Single',
      priority || 'Prospect',
      follow_up_date ? new Date(follow_up_date) : null,
      notes || null
    );

    const newLead = insertedLeads[0];

    if (creatorId) {
      const creators = await prisma.$queryRawUnsafe(
        `SELECT id, name, email, phone, user_type FROM "User" WHERE id = $1`,
        creatorId
      ).catch(() => []);
      newLead.creator = Array.isArray(creators) && creators.length > 0 ? creators[0] : null;
    } else {
      newLead.creator = null;
    }

    const insertedItems = [];
    for (const item of itemsToSave) {
      const itemQty = parseInt(item.quantity || '1', 10);
      let itemPrice = parseFloat(item.unit_price || '0');
      if ((isNaN(itemPrice) || itemPrice <= 0) && item.total_price !== undefined && item.total_price !== null && parseFloat(item.total_price) > 0) {
        itemPrice = parseFloat(item.total_price) / itemQty;
      }
      const itemTotal = item.total_price !== undefined && item.total_price !== null && item.total_price !== ''
        ? parseFloat(item.total_price)
        : (itemQty * itemPrice);

      const res = await prisma.$queryRawUnsafe(
        `INSERT INTO sales_lead_items (lead_id, product_id, product_sku_id, product_name, product_image, size, quantity, unit_price, total_price, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         RETURNING *`,
        newLead.id,
        item.product_id ? String(item.product_id) : null,
        item.product_sku_id ? parseInt(item.product_sku_id, 10) : null,
        item.product_name,
        item.product_image || null,
        item.size || null,
        itemQty,
        itemPrice,
        itemTotal
      );
      if (Array.isArray(res) && res.length > 0) {
        insertedItems.push(res[0]);
      }
    }

    newLead.items = insertedItems;

    // SYNC TO CUSTOMER CART
    if (user_id) {
      await syncLeadToCustomerCart(newLead.id, user_id, creatorId, itemsToSave);
    }

    return NextResponse.json({ message: 'Sales lead created successfully', lead: newLead }, { status: 201 });
  } catch (error) {
    console.error('Failed to create sales lead:', error);
    return NextResponse.json({ error: 'Failed to create sales lead', details: error?.message || String(error) }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, user_id, created_by_id, status, customer_name, email, phone, shipping_type, lead_type, priority, follow_up_date, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Lead ID is required.' }, { status: 400 });
    }

    const leadId = parseInt(id, 10);
    const currentUser = getLoggedInUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required to update lead.' }, { status: 401 });
    }

    const isAdmin = currentUser.user_type === 'admin' || currentUser.user_type === 'superadmin';

    // Verify ownership before updating
    const existingLeads = await prisma.$queryRawUnsafe(
      `SELECT id, created_by_id FROM sales_leads WHERE id = $1`,
      leadId
    );

    if (Array.isArray(existingLeads) && existingLeads.length > 0) {
      const lead = existingLeads[0];
      if (!isAdmin && lead.created_by_id && lead.created_by_id !== currentUser.id) {
        return NextResponse.json({ error: 'Access Denied: You do not have permission to modify this lead.' }, { status: 403 });
      }
    }

    const creatorId = created_by_id ? parseInt(created_by_id, 10) : currentUser.id;

    if (Array.isArray(body.items) && body.items.length > 0) {
      const itemsToSave = body.items.filter((it) => it.product_name && it.product_name.trim());

      if (itemsToSave.length > 0) {
        const prodIds = Array.from(new Set(itemsToSave.map((it) => it.product_id).filter(Boolean)));
        if (prodIds.length > 0) {
          const prods = await prisma.productShop.findMany({
            where: { id: { in: prodIds } },
            select: { id: true, en_title: true, title: true }
          }).catch(() => []);
          const prodMap = new Map(prods.map((p) => [p.id, p]));

          itemsToSave.forEach((it) => {
            if (it.product_id && prodMap.has(it.product_id)) {
              const p = prodMap.get(it.product_id);
              if (p.en_title && (!it.product_name || it.product_name === p.title)) {
                it.product_name = p.en_title;
              }
            }
          });
        }

        const totalUnits = itemsToSave.reduce((sum, it) => sum + (parseInt(it.quantity || '1', 10) || 1), 0);
        const autoCalculatedTotal = itemsToSave.reduce((sum, it) => {
          const q = parseInt(it.quantity || '1', 10);
          const u = parseFloat(it.unit_price || '0');
          const itemTot = it.total_price !== undefined && it.total_price !== null && it.total_price !== ''
            ? parseFloat(it.total_price)
            : (q * u);
          return sum + itemTot;
        }, 0);

        const overallTotal = body.total_price !== undefined && body.total_price !== null && body.total_price !== ''
          ? parseFloat(body.total_price)
          : autoCalculatedTotal;

        await prisma.$executeRawUnsafe(
          `UPDATE sales_leads 
           SET customer_name = COALESCE($1, customer_name),
               email = COALESCE($2, email),
               phone = COALESCE($3, phone),
               user_id = COALESCE($4, user_id),
               shipping_type = COALESCE($5, shipping_type),
               status = COALESCE($6, status),
               notes = COALESCE($7, notes),
               lead_type = COALESCE($8, lead_type),
               priority = COALESCE($9, priority),
               follow_up_date = $10,
               quantity = $11,
               total_price = $12,
               created_by_id = COALESCE($13, created_by_id),
               updated_at = NOW()
           WHERE id = $14`,
          customer_name || null,
          email || null,
          phone || null,
          user_id ? parseInt(user_id, 10) : null,
          shipping_type || null,
          status || null,
          notes || null,
          lead_type || null,
          priority || null,
          follow_up_date ? new Date(follow_up_date) : null,
          totalUnits,
          overallTotal,
          created_by_id ? parseInt(created_by_id, 10) : null,
          leadId
        );

        await prisma.$executeRawUnsafe(`DELETE FROM sales_lead_items WHERE lead_id = $1`, leadId);

        for (const item of itemsToSave) {
          const itemQty = parseInt(item.quantity || '1', 10);
          let itemPrice = parseFloat(item.unit_price || '0');
      if ((isNaN(itemPrice) || itemPrice <= 0) && item.total_price !== undefined && item.total_price !== null && parseFloat(item.total_price) > 0) {
        itemPrice = parseFloat(item.total_price) / itemQty;
      }
          const itemTotal = item.total_price !== undefined && item.total_price !== null && item.total_price !== ''
            ? parseFloat(item.total_price)
            : (itemQty * itemPrice);

          await prisma.$executeRawUnsafe(
            `INSERT INTO sales_lead_items (lead_id, product_id, product_sku_id, product_name, product_image, size, quantity, unit_price, total_price, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
            leadId,
            item.product_id ? String(item.product_id) : null,
            item.product_sku_id ? parseInt(item.product_sku_id, 10) : null,
            item.product_name,
            item.product_image || null,
            item.size || null,
            itemQty,
            itemPrice,
            itemTotal
          );
        }

        // SYNC TO CUSTOMER CART
        if (user_id) {
          await syncLeadToCustomerCart(leadId, user_id, creatorId, itemsToSave);
        }
      }
    } else {
      await prisma.$executeRawUnsafe(
        `UPDATE sales_leads 
         SET customer_name = COALESCE($1, customer_name),
             email = COALESCE($2, email),
             phone = COALESCE($3, phone),
             user_id = COALESCE($4, user_id),
             shipping_type = COALESCE($5, shipping_type),
             status = COALESCE($6, status),
             notes = COALESCE($7, notes),
             lead_type = COALESCE($8, lead_type),
             priority = COALESCE($9, priority),
             follow_up_date = COALESCE($10, follow_up_date),
             total_price = COALESCE($11, total_price),
             created_by_id = COALESCE($12, created_by_id),
             updated_at = NOW()
         WHERE id = $13`,
        customer_name || null,
        email || null,
        phone || null,
        user_id ? parseInt(user_id, 10) : null,
        shipping_type || null,
        status || null,
        notes || null,
        lead_type || null,
        priority || null,
        follow_up_date ? new Date(follow_up_date) : null,
        body.total_price !== undefined && body.total_price !== null && body.total_price !== '' ? parseFloat(body.total_price) : null,
        created_by_id ? parseInt(created_by_id, 10) : null,
        leadId
      );
    }

    const updatedLeads = await prisma.$queryRawUnsafe(
      `SELECT id, user_id, created_by_id, customer_name, email, phone, quantity, shipping_type, total_price, status, lead_type, priority, follow_up_date, notes, created_at, updated_at
       FROM sales_leads WHERE id = $1`,
      leadId
    );
    const updatedLead = updatedLeads[0];

    if (updatedLead.created_by_id) {
      const creators = await prisma.$queryRawUnsafe(
        `SELECT id, name, email, phone, user_type FROM "User" WHERE id = $1`,
        updatedLead.created_by_id
      ).catch(() => []);
      updatedLead.creator = Array.isArray(creators) && creators.length > 0 ? creators[0] : null;
    }

    const items = await prisma.$queryRawUnsafe(
      `SELECT id, lead_id, product_id, product_sku_id, product_name, product_image, size, quantity, unit_price, total_price, created_at, updated_at
       FROM sales_lead_items WHERE lead_id = $1 ORDER BY id ASC`,
      leadId
    );
    updatedLead.items = Array.isArray(items) ? items : [];

    return NextResponse.json({ message: 'Lead updated successfully', lead: updatedLead });
  } catch (error) {
    console.error('Failed to update sales lead:', error);
    return NextResponse.json({ error: 'Failed to update sales lead' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Lead ID is required.' }, { status: 400 });
    }

    const leadId = parseInt(id, 10);
    const currentUser = getLoggedInUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required to delete lead.' }, { status: 401 });
    }

    const isAdmin = currentUser.user_type === 'admin' || currentUser.user_type === 'superadmin';

    // Verify ownership before deleting
    const existingLeads = await prisma.$queryRawUnsafe(
      `SELECT id, created_by_id FROM sales_leads WHERE id = $1`,
      leadId
    );

    if (Array.isArray(existingLeads) && existingLeads.length > 0) {
      const lead = existingLeads[0];
      if (!isAdmin && lead.created_by_id && lead.created_by_id !== currentUser.id) {
        return NextResponse.json({ error: 'Access Denied: You do not have permission to delete this lead.' }, { status: 403 });
      }
    }

    await prisma.$executeRawUnsafe(`DELETE FROM "Cart" WHERE lead_id = $1`, leadId);
    await prisma.$executeRawUnsafe(`DELETE FROM sales_lead_items WHERE lead_id = $1`, leadId);
    await prisma.$executeRawUnsafe(`DELETE FROM sales_leads WHERE id = $1`, leadId);

    return NextResponse.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Failed to delete sales lead:', error);
    return NextResponse.json({ error: 'Failed to delete sales lead' }, { status: 500 });
  }
}

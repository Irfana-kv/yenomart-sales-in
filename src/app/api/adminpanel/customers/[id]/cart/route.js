import { GET as getCustomerCart } from '@/app/api/sales/customers/[id]/cart/route';

export async function GET(request, context) {
  return getCustomerCart(request, context);
}

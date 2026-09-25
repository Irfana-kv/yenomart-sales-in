'use client';

import SalesLayout from '@/components/SalesLayout';
import SalesLeadsPage from '@/components/SalesLeadsPage';

export default function AdminSalesLeadsRoute() {
  return (
    <SalesLayout>
      <SalesLeadsPage />
    </SalesLayout>
  );
}

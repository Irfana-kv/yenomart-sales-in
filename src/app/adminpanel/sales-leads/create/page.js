'use client';

import SalesLayout from '@/components/SalesLayout';
import SalesLeadFormPage from '@/components/SalesLeadFormPage';

export default function AdminCreateSalesLeadPage() {
  return (
    <SalesLayout>
      <SalesLeadFormPage isAdmin={true} />
    </SalesLayout>
  );
}

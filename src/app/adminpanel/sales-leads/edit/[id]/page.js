'use client';

import { use } from 'react';
import SalesLayout from '@/components/SalesLayout';
import SalesLeadFormPage from '@/components/SalesLeadFormPage';

export default function AdminEditSalesLeadPage({ params }) {
  const resolvedParams = use(params);
  return (
    <SalesLayout>
      <SalesLeadFormPage leadId={resolvedParams.id} isAdmin={true} />
    </SalesLayout>
  );
}

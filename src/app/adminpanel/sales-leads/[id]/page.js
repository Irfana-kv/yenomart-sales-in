'use client';

import { use } from 'react';
import SalesLayout from '@/components/SalesLayout';
import SalesLeadDetailsPage from '@/components/SalesLeadDetailsPage';

export default function AdminSalesLeadDetailsRoute({ params }) {
  const resolvedParams = use(params);
  return (
    <SalesLayout>
      <SalesLeadDetailsPage leadId={resolvedParams.id} isAdmin={true} />
    </SalesLayout>
  );
}

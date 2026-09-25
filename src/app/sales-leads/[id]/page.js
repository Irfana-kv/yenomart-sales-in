'use client';

import { use } from 'react';
import SalesLayout from '@/components/SalesLayout';
import SalesLeadDetailsPage from '@/components/SalesLeadDetailsPage';

export default function SalesLeadDetailsRoute({ params }) {
  const resolvedParams = use(params);
  return (
    <SalesLayout>
      <SalesLeadDetailsPage leadId={resolvedParams.id} isAdmin={false} />
    </SalesLayout>
  );
}

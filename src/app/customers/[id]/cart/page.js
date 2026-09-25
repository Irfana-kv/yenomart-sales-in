'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import SalesLayout from '@/components/SalesLayout';
import CustomerCartDetailsPage from '@/components/CustomerCartDetailsPage';

export default function CustomerCartRoutePage() {
  const params = useParams();
  const customerId = params?.id || params?.customerId;

  const { data, error, isLoading, mutate } = useSWR(
    customerId ? `/api/admin/cart-customers?userId=${customerId}` : null,
    fetcher,
    { revalidateOnFocus: true }
  );

  if (isLoading) {
    return (
      <SalesLayout>
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-400">Loading Customer Cart Details...</p>
        </div>
      </SalesLayout>
    );
  }

  if (error || !data) {
    return (
      <SalesLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 font-bold text-xl">
            !
          </div>
          <h3 className="text-base font-bold text-white">Failed to load customer cart details</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            We couldn&apos;t retrieve the cart items for customer #{customerId}. Please verify the customer ID and try again.
          </p>
        </div>
      </SalesLayout>
    );
  }

  return (
    <SalesLayout>
      <CustomerCartDetailsPage
        customerData={data.customer}
        cartData={data.cart || []}
        inrRate={data.inrRate || 1}
        pricingRules={data.pricingRules || []}
        mutate={mutate}
        isLoading={isLoading}
      />
    </SalesLayout>
  );
}

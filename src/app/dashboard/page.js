'use client';

import React from 'react';
import SalesLayout from '@/components/SalesLayout';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import Link from 'next/link';
import {
  Target,
  DollarSign,
  CheckCircle2,
  Package,
  Users,
  Plus,
  ArrowRight,
  Eye,
  Plane,
  Ship,
  Sparkles,
  ShoppingBag
} from 'lucide-react';

export default function SalesDashboardPage() {
  const { data, error, isLoading } = useSWR('/api/sales/stats', fetcher);

  if (isLoading) {
    return (
      <SalesLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400 font-medium">Loading Sales Metrics...</p>
          </div>
        </div>
      </SalesLayout>
    );
  }

  const stats = data || {};

  const getStatusBadge = (st) => {
    switch (st) {
      case 'New':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Contacted':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'In Progress':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Converted':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Lost':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <SalesLayout>
      <div className="space-y-8">
        {/* HERO BANNER */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-slate-800 p-6 sm:p-8 text-white shadow-2xl">
          <div className="pointer-events-none absolute -top-12 -right-12 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5 w-fit">
                <Sparkles className="w-3.5 h-3.5" /> Sales Performance
              </span>
              <h1 className="text-3xl font-black tracking-tight mt-2">Sales Agent Dashboard</h1>
              <p className="text-slate-400 text-sm mt-1">Real-time performance, active leads pipeline & customer conversion.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/sales-leads/create"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                Create New Lead
              </Link>
              <Link
                href="/cart-customers"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 transition"
              >
                Cart Customers
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: 'Total Sales Leads', value: stats.totalLeads || 0, icon: Target, color: 'from-blue-500 to-indigo-600', sub: 'Active inquiries' },
            { label: 'Active Pipeline Value', value: '₹' + (stats.pipelineValue || 0).toLocaleString(), icon: DollarSign, color: 'from-amber-500 to-orange-600', sub: 'Potential deal value' },
            { label: 'Converted Deal Sales', value: '₹' + (stats.convertedValue || 0).toLocaleString(), icon: CheckCircle2, color: 'from-emerald-500 to-teal-600', sub: 'Closed conversions' },
            { label: 'Total Units Requested', value: (stats.totalUnits || 0).toLocaleString(), icon: Package, color: 'from-purple-500 to-pink-600', sub: 'Requested item units' },
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.label}</p>
                  <p className="text-2xl font-black text-white mt-1">{card.value}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{card.sub}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${card.color} text-white flex items-center justify-center shadow-md flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            );
          })}
        </div>

        {/* RECENT SALES LEADS TABLE */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-3xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Recent Sales Leads</h3>
              <p className="text-xs text-slate-400">Latest sales inquiries created in the system</p>
            </div>
            <Link href="/sales-leads" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition">
              View All Leads <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Customer Name</th>
                  <th className="px-6 py-3.5">Contact Details</th>
                  <th className="px-6 py-3.5">Units & Shipping</th>
                  <th className="px-6 py-3.5">Total Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {!stats.recentLeads || stats.recentLeads.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">No recent sales leads recorded yet.</td>
                  </tr>
                ) : (
                  stats.recentLeads.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-900/50 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{l.customer_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">Lead #{l.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-300 text-xs">{l.email || '—'}</div>
                        <div className="text-xs text-slate-400 font-mono">{l.phone || '—'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-200">{l.quantity || 1} units</div>
                        <div className="text-[11px] text-slate-400 inline-flex items-center gap-1 mt-0.5">
                          {l.shipping_type === 'Sea' ? <Ship className="w-3 h-3 text-blue-400" /> : <Plane className="w-3 h-3 text-teal-400" />}
                          {l.shipping_type || 'Air'}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-black text-emerald-400">
                        ₹{(l.total_price || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(l.status)}`}>
                          {l.status || 'New'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/sales-leads/${l.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 text-xs font-bold transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SalesLayout>
  );
}

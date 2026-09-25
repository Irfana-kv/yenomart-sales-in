'use client';

import React from 'react';
import SalesLayout from '@/components/SalesLayout';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import Link from 'next/link';
import {
  ShoppingBag,
  DollarSign,
  Clock,
  Users,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Eye
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

  return (
    <SalesLayout>
      <div className="space-y-8">
        {/* HERO BANNER */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-slate-800 p-6 sm:p-8 text-white shadow-2xl">
          <div className="pointer-events-none absolute -top-12 -right-12 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">Sales Overview</span>
              <h1 className="text-3xl font-black tracking-tight mt-2">Sales Agent Dashboard</h1>
              <p className="text-slate-400 text-sm mt-1">Real-time performance, order processing & revenue metrics.</p>
            </div>
            <Link
              href="/cart-customers"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 hover:from-emerald-300 hover:to-teal-300 shadow-lg shadow-emerald-500/20 transition"
            >
              View Cart Customers
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: 'Total Sales Revenue', value: "₹" + (stats.totalRevenue || 0).toLocaleString(), icon: DollarSign, color: 'from-emerald-500 to-teal-600' },
            { label: 'Total Orders', value: stats.totalOrders || 0, icon: ShoppingBag, color: 'from-blue-500 to-indigo-600' },
            { label: 'Pending Shipments', value: stats.pendingOrders || 0, icon: Clock, color: 'from-amber-500 to-orange-600' },
            { label: 'Total Customers', value: stats.totalCustomers || 0, icon: Users, color: 'from-purple-500 to-pink-600' },
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${card.color} text-white flex items-center justify-center mb-3 shadow-md`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.label}</p>
                <p className="text-2xl font-black text-white mt-1">{card.value}</p>
              </div>
            );
          })}
        </div>

        {/* RECENT ORDERS TABLE */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-3xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Recent Orders</h3>
              <p className="text-xs text-slate-400">Latest customer order transactions</p>
            </div>
            <Link href="/cart-customers" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition">
              View Cart Customers <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Order No</th>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Payment</th>
                  <th className="px-6 py-3.5">Delivery Status</th>
                  <th className="px-6 py-3.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {!stats.recentOrders || stats.recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">No orders recorded yet.</td>
                  </tr>
                ) : (
                  stats.recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-900/50 transition">
                      <td className="px-6 py-4 font-mono font-bold text-emerald-400">{o.orderNo || `#${o.id}`}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{o.user?.name || 'Guest'}</div>
                        <div className="text-xs text-slate-400">{o.user?.email || o.user?.phone || '—'}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-white">₹{(o.grand_total || 0).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                          o.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {o.payment_status || 'unpaid'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                          o.delivery_status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {o.delivery_status || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {o.created_at ? new Date(o.created_at).toLocaleDateString() : 'N/A'}
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

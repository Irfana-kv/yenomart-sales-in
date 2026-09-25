'use client';

import React, { useState } from 'react';
import SalesLayout from '@/components/SalesLayout';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { Users, Search, Mail, Phone, MapPin, ShoppingBag, ShieldCheck, ShieldOff } from 'lucide-react';

const getInitials = (name) => {
  return (name || '')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
};

export default function SalesCustomersPage() {
  const [search, setSearch] = useState('');
  const { data: customers = [], isLoading } = useSWR('/api/sales/customers', fetcher);

  const filtered = customers.filter((c) => {
    return (
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || '').includes(search)
    );
  });

  return (
    <SalesLayout>
      <div className="space-y-6">
        {/* HERO BANNER */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-slate-800 p-6 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight">Customer Directory</h1>
              <p className="text-slate-400 text-sm mt-1">{customers.length} total registered customers</p>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search customer name, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition"
              />
            </div>
          </div>
        </div>

        {/* CUSTOMERS GRID / TABLE */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-3xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Customer Name</th>
                  <th className="px-6 py-3.5">Contact Info</th>
                  <th className="px-6 py-3.5">Location</th>
                  <th className="px-6 py-3.5">Total Orders</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">Loading customer profiles...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500">No customers found.</td></tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-900/50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0">
                            {getInitials(c.name)}
                          </div>
                          <div className="font-bold text-white">{c.name || 'Unnamed Customer'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-slate-300 flex items-center gap-1"><Mail className="w-3 h-3 text-slate-500" /> {c.email || 'No email'}</div>
                        {c.phone && <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3 text-slate-500" /> {c.phone}</div>}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {c.city || c.country ? (
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-500" /> {[c.city, c.country].filter(Boolean).join(', ')}</span>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <ShoppingBag className="w-3 h-3" /> {c._count?.orders || 0} Orders
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {c.banned ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400">
                            <ShieldOff className="w-3 h-3" /> Banned
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400">
                            <ShieldCheck className="w-3 h-3" /> Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}
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

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import SalesLayout from '@/components/SalesLayout';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import {
  ShoppingCart,
  Search,
  Mail,
  Phone,
  MessageSquare,
  Clock,
  TrendingUp,
  Package,
  DollarSign,
  Eye,
  X,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Filter,
  ArrowUpDown,
  ShoppingBag,
  MapPin,
} from 'lucide-react';

const getInitials = (name) => {
  return (name || '')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
};

const formatTimeAgo = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
};

export default function CartCustomersPage() {
  const [search, setSearch] = useState('');
  const [filterValue, setFilterValue] = useState('all'); // 'all' | 'high_value'
  const [sortBy, setSortBy] = useState('updated'); // 'updated' | 'value_desc' | 'items_desc'
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const { data, error, isLoading } = useSWR('/api/sales/cart-customers', fetcher);

  const summaryObj = data?.summary || {};
  const activeCartUsers = summaryObj.activeCartCustomers ?? summaryObj.totalActiveCarts ?? 0;
  const totalItemsCount = summaryObj.totalCartItems ?? summaryObj.totalCartItemsCount ?? 0;
  const totalCartValue = summaryObj.totalCartValue ?? summaryObj.totalPotentialRevenue ?? 0;
  const avgValue = activeCartUsers > 0 ? Math.round(totalCartValue / activeCartUsers) : (summaryObj.avgCartValue || 0);

  const customers = data?.customers || [];

  // Filter & Sort Logic
  const filteredCustomers = customers
    .filter((c) => {
      const u = c.user || { name: c.name, email: c.email, phone: c.phone };
      const matchesSearch =
        (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.phone || '').includes(search) ||
        (c.items || []).some((item) => (item.title || '').toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      const val = c.cartValue ?? c.totalValue ?? 0;
      if (filterValue === 'high_value') {
        return val >= 5000;
      }

      return true;
    })
    .sort((a, b) => {
      const valA = a.cartValue ?? a.totalValue ?? 0;
      const valB = b.cartValue ?? b.totalValue ?? 0;
      const itemsA = a.numCartItems ?? a.totalItems ?? 0;
      const itemsB = b.numCartItems ?? b.totalItems ?? 0;

      if (sortBy === 'value_desc') return valB - valA;
      if (sortBy === 'items_desc') return itemsB - itemsA;
      return new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0);
    });

  const getWhatsAppLink = (customer) => {
    const u = customer.user || { name: customer.name, phone: customer.phone };
    const rawPhone = customer.phone || u.whatsapp_number || u.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (!cleanPhone) return '#';

    const itemsCount = customer.numCartItems ?? customer.totalItems ?? 0;
    const cartVal = customer.cartValue ?? customer.totalValue ?? 0;
    const firstItem = customer.items?.[0]?.title || 'items';
    const message = encodeURIComponent(
      `Hi ${u.name || 'there'}! We noticed you have ${itemsCount} item(s) worth ₹${cartVal.toLocaleString()} (including "${firstItem}") in your Yenomart shopping cart. Need any assistance with checkout?`
    );

    return `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${message}`;
  };

  return (
    <SalesLayout>
      <div className="space-y-8">
        {/* HERO BANNER */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-slate-800 p-6 sm:p-8 text-white shadow-2xl">
          <div className="pointer-events-none absolute -top-12 -right-12 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                <Sparkles className="w-3.5 h-3.5" /> Cart Intent & Abandoned Carts
              </span>
              <h1 className="text-3xl font-black tracking-tight mt-2">Cart Customers</h1>
              <p className="text-slate-400 text-sm mt-1 max-w-2xl">
                Monitor active shopping carts in real time, view items chosen by customers, and follow up directly to drive sales conversions.
              </p>
            </div>

            {/* SEARCH INPUT */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, phone, product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-2xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* METRICS STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              label: 'Active Cart Users',
              value: activeCartUsers.toLocaleString(),
              sub: 'Customers with cart items',
              icon: ShoppingCart,
              color: 'from-emerald-500 to-teal-600',
              borderColor: 'border-emerald-500/20',
            },
            {
              label: 'Total Cart Items',
              value: totalItemsCount.toLocaleString(),
              sub: 'Items waiting for checkout',
              icon: Package,
              color: 'from-blue-500 to-indigo-600',
              borderColor: 'border-blue-500/20',
            },
            {
              label: 'Potential Cart Revenue',
              value: `₹${totalCartValue.toLocaleString()}`,
              sub: 'Combined active cart value',
              icon: DollarSign,
              color: 'from-purple-500 to-pink-600',
              borderColor: 'border-purple-500/20',
            },
            {
              label: 'Avg Cart Value',
              value: `₹${avgValue.toLocaleString()}`,
              sub: 'Per cart customer',
              icon: TrendingUp,
              color: 'from-amber-500 to-orange-600',
              borderColor: 'border-amber-500/20',
            },
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className={`bg-slate-950/80 border ${card.borderColor} rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${card.color} text-white flex items-center justify-center shadow-md`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">{card.sub}</span>
                </div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-4">{card.label}</p>
                <p className="text-2xl font-black text-white mt-1 tracking-tight">{card.value}</p>
              </div>
            );
          })}
        </div>

        {/* FILTERS & TABLE CONTROLS */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-3xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                Active Customer Carts ({filteredCustomers.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Click any row or action to inspect cart contents & reach out</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Filter By Value */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="bg-transparent text-slate-200 focus:outline-none font-medium cursor-pointer"
                >
                  <option value="all" className="bg-slate-900">All Cart Values</option>
                  <option value="high_value" className="bg-slate-900">High Value (≥ ₹5,000)</option>
                </select>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-slate-200 focus:outline-none font-medium cursor-pointer"
                >
                  <option value="updated" className="bg-slate-900">Sort: Recently Updated</option>
                  <option value="value_desc" className="bg-slate-900">Sort: Value (High to Low)</option>
                  <option value="items_desc" className="bg-slate-900">Sort: Items Count</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Cart Summary</th>
                  <th className="px-6 py-4">Items Preview</th>
                  <th className="px-6 py-4">Last Activity</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm font-medium">Fetching active cart customer records...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-16 text-center text-slate-500">
                      <ShoppingCart className="w-12 h-12 mx-auto text-slate-700 mb-3 stroke-[1.5]" />
                      <p className="text-base font-bold text-slate-300">No Cart Customers Found</p>
                      <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or filters.</p>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => {
                    const u = c.user || {};
                    const name = c.name || u.name || 'Guest Customer';
                    const email = c.email || u.email || '';
                    const phone = c.phone || u.phone || c.whatsapp_number || u.whatsapp_number || '';
                    const city = c.city || u.city || '';
                    const country = c.country || u.country || '';

                    const waLink = getWhatsAppLink(c);
                    const isWaAvailable = Boolean(phone);

                    return (
                      <tr
                        key={c.key || c.id}
                        className="hover:bg-slate-900/50 transition cursor-pointer group"
                        onClick={() => setSelectedCustomer(c)}
                      >
                        {/* CUSTOMER INFO */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-slate-950 font-extrabold text-sm flex items-center justify-center shrink-0 shadow-md">
                              {getInitials(name)}
                            </div>
                            <div>
                              <div className="font-bold text-white group-hover:text-emerald-400 transition flex items-center gap-1.5">
                                {name}
                              </div>
                              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                                {email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-slate-500" /> {email}
                                  </span>
                                )}
                                {phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-slate-500" /> {phone}
                                  </span>
                                )}
                              </div>
                              {(city || country) && (
                                <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3" /> {[city, country].filter(Boolean).join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* CART SUMMARY */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit">
                              <ShoppingCart className="w-3.5 h-3.5" />
                              ₹{(c.cartValue ?? c.totalValue ?? 0).toLocaleString()}
                            </span>
                            <span className="text-xs font-semibold text-slate-400 pl-1">
                              {c.numCartItems ?? c.totalItems ?? 0} {(c.numCartItems ?? c.totalItems ?? 0) === 1 ? 'item' : 'items'} in cart
                            </span>
                          </div>
                        </td>

                        {/* ITEMS PREVIEW */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {(c.items || []).slice(0, 3).map((item, i) => (
                              <div
                                key={i}
                                className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 overflow-hidden relative shrink-0"
                                title={`${item.title} (x${item.quantity}) - ₹${item.price}`}
                              >
                                {item.image ? (
                                  <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500 font-bold">
                                    IMG
                                  </div>
                                )}
                              </div>
                            ))}
                            {(c.items || []).length > 3 && (
                              <span className="text-xs font-bold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-1 rounded-xl">
                                +{(c.items || []).length - 3}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* LAST ACTIVITY */}
                        <td className="px-6 py-4">
                          <div className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {formatTimeAgo(c.lastUpdated)}
                          </div>
                        </td>

                        {/* ACTIONS */}
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/adminpanel/customers/${c.id || c.userId || u.id || 0}/cart`}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-emerald-500/30 transition flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-400" />
                              View Items
                            </Link>

                            {isWaAvailable && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition flex items-center gap-1"
                                title="Contact via WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                WhatsApp
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CART DETAIL MODAL */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-slate-950 font-black text-base flex items-center justify-center">
                  {getInitials(selectedCustomer.user?.name)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {selectedCustomer.user?.name || 'Guest Customer'}
                  </h3>
                  <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                    {selectedCustomer.user?.email && <span>{selectedCustomer.user.email}</span>}
                    {selectedCustomer.user?.phone && <span>{selectedCustomer.user.phone}</span>}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MODAL STATS HEADER */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-900/90 border-b border-slate-800/80 px-6">
              <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                <p className="text-[11px] font-semibold text-slate-400 uppercase">Total Items in Cart</p>
                <p className="text-xl font-black text-white mt-0.5">{selectedCustomer.numCartItems ?? selectedCustomer.totalItems ?? 0} Items</p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                <p className="text-[11px] font-semibold text-slate-400 uppercase">Cart Total Value</p>
                <p className="text-xl font-black text-emerald-400 mt-0.5">₹{(selectedCustomer.cartValue ?? selectedCustomer.totalValue ?? 0).toLocaleString()}</p>
              </div>
            </div>

            {/* MODAL ITEMS LIST */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Cart Items Breakdown</h4>
              {(selectedCustomer.items || []).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-bold">
                          NO IMG
                        </div>
                      )}
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-white line-clamp-1">{item.title}</h5>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                        <span>Price: <strong className="text-slate-200">₹{item.price.toLocaleString()}</strong></span>
                        <span>Qty: <strong className="text-emerald-400">{item.quantity}</strong></span>
                      </div>
                      {item.variation && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Variation: {typeof item.variation === 'object' ? JSON.stringify(item.variation) : item.variation}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400">Subtotal</p>
                    <p className="text-base font-black text-emerald-400">₹{item.subtotal.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* MODAL FOOTER */}
            <div className="p-6 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-4">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Updated {formatTimeAgo(selectedCustomer.lastUpdated)}
              </span>

              <div className="flex items-center gap-3">
                {Boolean(selectedCustomer.user?.phone || selectedCustomer.user?.whatsapp_number) && (
                  <a
                    href={getWhatsAppLink(selectedCustomer)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 transition flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Send WhatsApp Follow-up
                  </a>
                )}
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SalesLayout>
  );
}

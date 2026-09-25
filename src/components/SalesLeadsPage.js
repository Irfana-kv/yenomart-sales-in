'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Target,
  Plus,
  Search,
  RefreshCw,
  Plane,
  Ship,
  DollarSign,
  Package,
  CheckCircle2,
  Send,
  Trash2,
  Edit3,
  Eye,
  Phone,
  Mail,
  UserCheck,
  User,
  ChevronDown,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';

export default function SalesLeadsPage({ isAdmin = false }) {
  const [leads, setLeads] = useState([]);
  const [summary, setSummary] = useState({
    totalLeads: 0,
    pipelineValue: 0,
    convertedValue: 0,
    totalUnits: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentUser, setCurrentUser] = useState(null);
  const [salesReps, setSalesReps] = useState([]);
  const [selectedSalesRepFilter, setSelectedSalesRepFilter] = useState('All');

  const basePath = isAdmin ? '/adminpanel/sales-leads' : '/sales-leads';
  // Fetch logged in user and sales representatives list
  useEffect(() => {
    const fetchAuthUser = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();
        if (meData?.user) setCurrentUser(meData.user);

        // Fetch sales reps list for Admin filtering
        const repsRes = await fetch('/api/sales/customers');
        const repsData = await repsRes.json();
        if (Array.isArray(repsData)) {
          setSalesReps(repsData.filter((r) => r.user_type === 'sales' || r.user_type === 'admin'));
        }
      } catch (err) {
        console.error('Failed to fetch user auth session:', err);
      }
    };
    fetchAuthUser();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      let url = `/api/sales/leads?search=${encodeURIComponent(search)}&status=${encodeURIComponent(statusFilter)}`;
      if (selectedSalesRepFilter && selectedSalesRepFilter !== 'All') {
        url += `&sales_rep_id=${selectedSalesRepFilter}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.leads) {
        setLeads(data.leads);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [search, statusFilter, selectedSalesRepFilter]);

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      const res = await fetch('/api/sales/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, status: newStatus })
      });
      if (res.ok) {
        fetchLeads();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDelete = async (leadId) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      const res = await fetch(`/api/sales/leads?id=${leadId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchLeads();
      }
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

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
    <div className="space-y-6 pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-white tracking-tight">Sales Leads</h1>
                {(currentUser?.user_type === 'admin' || currentUser?.user_type === 'superadmin' || isAdmin) ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    👑 Admin View (All Leads)
                  </span>
                ) : currentUser ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                    👤 My Leads ({currentUser.name || currentUser.email})
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {(currentUser?.user_type === 'admin' || currentUser?.user_type === 'superadmin' || isAdmin)
                  ? 'Viewing all sales leads created across the portal'
                  : 'Manage and track product inquiries entered by you'}
              </p>
            </div>
          </div>
        </div>

        {/* LINK TO DEDICATED CREATE PAGE */}
        <Link
          href={`${basePath}/create`}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition active:scale-[0.98]"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          Create New Lead
        </Link>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 backdrop-blur-md flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Leads</p>
            <h3 className="text-2xl font-black text-white mt-1">{summary.totalLeads}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Inquiries generated</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Target className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 backdrop-blur-md flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Pipeline</p>
            <h3 className="text-2xl font-black text-amber-400 mt-1">₹{summary.pipelineValue.toLocaleString()}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Potential deal value</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 backdrop-blur-md flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Converted Sales</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">₹{summary.convertedValue.toLocaleString()}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Closed deals value</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 backdrop-blur-md flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Units</p>
            <h3 className="text-2xl font-black text-purple-400 mt-1">{summary.totalUnits.toLocaleString()}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Units requested</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-md">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-slate-100 focus:outline-none focus:border-emerald-500/50 transition placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {['All', 'New', 'Contacted', 'In Progress', 'Converted', 'Lost'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-950 text-slate-400 border border-slate-800/80 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}

          <button
            onClick={fetchLeads}
            className="p-2.5 rounded-xl bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 transition ml-auto"
            title="Refresh Leads"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* LEADS DATA TABLE */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 backdrop-blur-md overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-5">Customer</th>
                <th className="py-4 px-5">Type & Priority</th>
                <th className="py-4 px-5">Product Details</th>
                <th className="py-4 px-5">Qty & Price</th>
                <th className="py-4 px-5">Shipping & Follow-up</th>
                <th className="py-4 px-5">Total Amount</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    Loading leads data...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Target className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    No leads found matching your criteria.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-800/40 transition">
                    {/* CUSTOMER */}
                    <td className="py-4 px-5">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                          {lead.customer_name}
                          {lead.user && (
                            <span title="Registered Customer" className="text-emerald-400">
                              <UserCheck className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                        {lead.phone && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {lead.phone}
                          </div>
                        )}
                        {lead.email && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-500" />
                            {lead.email}
                          </div>
                        )}
                        {/* ENTERED BY USER BADGE */}
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1.5 border-t border-slate-800/60 mt-1.5">
                          <User className="w-3 h-3 text-indigo-400" />
                          <span>Entered by:</span>
                          <span className="font-bold text-indigo-300">
                            {lead.creator?.name || lead.creator?.email || (lead.created_by_id ? `User #${lead.created_by_id}` : 'System / Admin')}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* TYPE & PRIORITY */}
                    <td className="py-4 px-5">
                      <div className="space-y-1.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          lead.priority === 'Hot Lead'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : lead.priority === 'Prospect'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : lead.priority === 'Warm'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {lead.priority === 'Hot Lead' ? '🔥 Hot Lead' : lead.priority === 'Prospect' ? '🎯 Prospect' : (lead.priority || 'Prospect')}
                        </span>

                        <div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${
                            lead.lead_type === 'Bulk'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {lead.lead_type === 'Bulk' ? '📦 Bulk' : '👤 Single'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* PRODUCT */}
                    <td className="py-4 px-5">
                      {(() => {
                        const firstItem = (lead.items && lead.items[0]) || {};
                        const hasMultipleItems = Array.isArray(lead.items) && lead.items.length > 1;
                        const displayTitle = firstItem.product_name || 'No Product Specified';

                        return (
                          <div className="flex items-center gap-3">
                            {firstItem.product_image ? (
                              <img
                                src={firstItem.product_image}
                                alt={displayTitle}
                                className="w-11 h-11 rounded-lg object-cover bg-slate-950 border border-slate-800 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 flex-shrink-0">
                                <ShoppingBag className="w-5 h-5" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-200 text-xs line-clamp-2 max-w-[200px]">
                                {displayTitle}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {hasMultipleItems && (
                                  <span className="px-2 py-0.5 rounded bg-teal-500/10 text-[10px] font-bold text-teal-300 border border-teal-500/20">
                                    +{lead.items.length - 1} more ({lead.items.length} items)
                                  </span>
                                )}
                                {firstItem.size && (
                                  <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-semibold text-slate-300 border border-slate-700">
                                    Size: {firstItem.size}
                                  </span>
                                )}
                                {(firstItem.product_sku_id || firstItem.product_id) && (
                                  <span className="text-slate-400 text-[10px] font-mono">
                                    SKU: #{firstItem.product_sku_id || firstItem.product_id}
                                  </span>
                                )}
                                {firstItem.product_id && (
                                  <a
                                    href={`https://www.yenomart.com/productdetail/${firstItem.product_id}`}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="text-emerald-400 hover:text-emerald-300 text-[10px] font-semibold hover:underline inline-flex items-center gap-0.5"
                                  >
                                    View on Yenomart <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    {/* QTY & PRICE */}
                    <td className="py-4 px-5">
                      <div className="space-y-0.5">
                        <p className="text-slate-300 font-semibold">Qty: {lead.quantity} units</p>
                        {Array.isArray(lead.items) && lead.items.length > 1 ? (
                          <p className="text-[11px] text-teal-400 font-bold">{lead.items.length} product items</p>
                        ) : (
                          <p className="text-[11px] text-slate-400">
                            ₹{(lead.items && lead.items[0]?.unit_price ? lead.items[0].unit_price : 0).toLocaleString()} / unit
                          </p>
                        )}
                      </div>
                    </td>

                    {/* SHIPPING */}
                    <td className="py-4 px-5">
                      <div className="space-y-1.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          lead.shipping_type === 'Sea'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                        }`}>
                          {lead.shipping_type === 'Sea' ? <Ship className="w-3.5 h-3.5" /> : <Plane className="w-3.5 h-3.5" />}
                          {lead.shipping_type || 'Air'}
                        </span>

                        {lead.follow_up_date && (
                          <div className="text-[10px] font-semibold text-purple-300 flex items-center gap-1 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md w-fit">
                            📅 {new Date(lead.follow_up_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* TOTAL AMOUNT */}
                    <td className="py-4 px-5">
                      <div className="font-black text-emerald-400 text-sm">
                        ₹{(lead.total_price || 0).toLocaleString()}
                      </div>
                    </td>

                    {/* STATUS */}
                    <td className="py-4 px-5">
                      <div className="relative inline-block">
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          className={`appearance-none cursor-pointer pl-3 pr-7 py-1 rounded-full text-xs font-bold border focus:outline-none transition ${getStatusBadge(
                            lead.status
                          )}`}
                        >
                          <option value="New" className="bg-slate-900 text-slate-200">New</option>
                          <option value="Contacted" className="bg-slate-900 text-slate-200">Contacted</option>
                          <option value="In Progress" className="bg-slate-900 text-slate-200">In Progress</option>
                          <option value="Converted" className="bg-slate-900 text-slate-200">Converted</option>
                          <option value="Lost" className="bg-slate-900 text-slate-200">Lost</option>
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                      </div>
                    </td>

                    {/* ACTIONS */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {lead.phone && (
                          <a
                            href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                              `Hello ${lead.customer_name}, following up regarding your inquiry for ${lead.items?.[0]?.product_name || 'products'} at Yenomart.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition"
                            title="Chat on WhatsApp"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <Link
                          href={`${basePath}/${lead.id}`}
                          className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition"
                          title="View Lead Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`${basePath}/edit/${lead.id}`}
                          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700 transition"
                          title="Edit Lead Page"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

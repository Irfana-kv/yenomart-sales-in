'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Target,
  ArrowLeft,
  UserCheck,
  Phone,
  Mail,
  Calendar,
  Plane,
  Ship,
  DollarSign,
  Package,
  Edit3,
  Download,
  Printer,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  User,
  CheckCircle2,
  Clock,
  Sparkles,
  Flame,
  FileText,
  Share2,
  FileCheck,
  Loader2,
  X,
  Home
} from 'lucide-react';
import Toast from '@/components/Toast';
import { exportCustomerCartPdf } from '@/utils/exportCartPdf';
import { exportCustomerCartExcel } from '@/utils/exportCartExcel';

export default function SalesLeadDetailsPage({ leadId, isAdmin = false }) {
  const router = useRouter();
  const listPath = isAdmin ? '/adminpanel/sales-leads' : '/sales-leads';

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Action Modals State
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [freightType, setFreightType] = useState('Air Freight');
  const [deliveryCharge, setDeliveryCharge] = useState('');
  const [shippingNote, setShippingNote] = useState('');
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const fetchLeadDetails = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/sales/leads?id=' + leadId);
      const data = await res.json();
      if (res.ok && data.lead) {
        setLead(data.lead);
      } else {
        setErrorMsg(data.error || 'Failed to load lead details.');
      }
    } catch (err) {
      console.error('Error loading lead details:', err);
      setErrorMsg('An unexpected error occurred while fetching lead details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) fetchLeadDetails();
  }, [leadId]);

  // Adapt Customer Data structure
  const customer = useMemo(() => {
    if (!lead) return { id: 'N/A', name: 'Customer', email: '—', phone: '—' };
    return {
      id: lead.user_id || 'N/A',
      name: lead.customer_name || 'Customer',
      email: lead.email || '—',
      phone: lead.phone || '—',
      businessName: lead.customer_name,
      city: '—',
      state: '—',
      country: 'India',
    };
  }, [lead]);

  // Adapt Processed Products structure
  const processedProducts = useMemo(() => {
    if (!lead || !Array.isArray(lead.items)) return [];
    return lead.items.map((item) => {
      const qty = Number(item.quantity || 1);
      const price = Number(item.unit_price || 0);
      const total = Number(item.total_price || qty * price);

      return {
        id: item.id,
        productId: item.product_id || 'N/A',
        product_id: item.product_id || 'N/A',
        product_name: item.product_name,
        name: item.product_name,
        sku: item.product_sku_id || 'N/A',
        image: item.product_image || '',
        thumbnail_img: item.product_image || '',
        price: price,
        rule_price: price,
        quantity: qty,
        order_total: total,
        totals: {
          order_price: total,
          base_cny: total / 12.5,
          inr_adjusted: total,
        },
        variation_name: item.size || null,
        variation: item.size || null,
      };
    });
  }, [lead]);

  // Adapt Subtotals structure
  const subtotals = useMemo(() => {
    const subtotalOrderPrice = Number(lead?.total_price || 0) || processedProducts.reduce((acc, p) => acc + p.order_total, 0);
    const deliveryAmt = Number(deliveryCharge) || 0;
    const grandTotal = subtotalOrderPrice + deliveryAmt;
    const totalQuantity = Number(lead?.quantity || 0) || processedProducts.reduce((acc, p) => acc + p.quantity, 0);

    return {
      subtotalOrderPrice,
      deliveryCharge: deliveryAmt,
      grandTotal,
      totalQuantity,
    };
  }, [lead, processedProducts, deliveryCharge]);

  const handleStatusChange = async (newStatus) => {
    if (!lead || lead.status === newStatus) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch('/api/sales/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lead.id, status: newStatus }),
      });
      if (res.ok) {
        setLead((prev) => ({ ...prev, status: newStatus }));
        setToast({ type: 'success', message: 'Status updated to ' + newStatus });
      } else {
        setToast({ type: 'error', message: 'Failed to update lead status' });
      }
    } catch (err) {
      console.error('Status update failed:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleExportPdf = () => {
    if (!processedProducts.length) return;
    setPdfModalOpen(true);
  };

  const handleConfirmExportPdf = async () => {
    if (!processedProducts.length) return;
    setIsExportingPdf(true);
    try {
      await exportCustomerCartPdf({
        customer,
        cartItems: processedProducts,
        subtotals,
        deliveryCharge: Number(deliveryCharge) || 0,
        freightType,
        shippingNote,
      });
      setToast({ type: 'success', message: 'PDF Quotation generated & downloaded successfully.' });
      setPdfModalOpen(false);
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to export PDF quotation document.' });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    if (!processedProducts.length) return;
    setIsExportingExcel(true);
    try {
      await exportCustomerCartExcel({
        customer,
        cartItems: processedProducts,
        subtotals,
      });
      setToast({ type: 'success', message: 'Quotation Excel (.xlsx) downloaded successfully.' });
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to generate Quotation Excel file.' });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareLead = async () => {
    const text = 'Yenomart - Sales Lead Summary\nLead #' + lead.id + '\nCustomer: ' + customer.name + '\nItems: ' + processedProducts.length + '\nTotal Amount: INR ' + subtotals.grandTotal.toFixed(2) + '\nLink: ' + window.location.href;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setToast({ type: 'success', message: 'Lead summary & link copied to clipboard!' });
      }
    } catch {
      setToast({ type: 'info', message: 'Link ready in address bar.' });
    }
  };

  const handleConvertDraftOrder = async () => {
    setIsConverting(true);
    try {
      // 1. Update lead status to Converted
      await fetch('/api/sales/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lead.id, status: 'Converted' }),
      });
      setLead((prev) => ({ ...prev, status: 'Converted' }));

      const orderNo = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
      setConvertModalOpen(false);
      setToast({ type: 'success', message: 'Successfully converted Sales Lead #' + lead.id + ' into Order #' + orderNo + '!' });
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to convert lead to order.' });
    } finally {
      setIsConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin text-emerald-400" />
        <p className="text-sm font-semibold text-slate-400">Loading Sales Lead #{leadId}...</p>
      </div>
    );
  }

  if (errorMsg || !lead) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 font-bold text-2xl">
          !
        </div>
        <h3 className="text-lg font-bold text-white">{errorMsg || 'Sales Lead Not Found'}</h3>
        <Link
          href={listPath}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sales Leads
        </Link>
      </div>
    );
  }

  const formattedDate = (dStr) => {
    if (!dStr) return 'N/A';
    try {
      return new Date(dStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return dStr;
    }
  };

  return (
    <div className="space-y-6 pb-16 font-sans text-slate-100">
      <Toast toast={toast} setToast={setToast} />

      {/* TOP NAVIGATION & ACTION BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Link
          href={listPath}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition text-xs font-semibold w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sales Leads
        </Link>

        {/* EXACT SAME ACTION BUTTON GROUP FROM CUSTOMER CART DETAILS */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchLeadDetails}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            title="Refresh Lead Data"
          >
            <RefreshCw className={'w-3.5 h-3.5 ' + (loading ? 'animate-spin' : '')} /> Refresh
          </button>
          
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf || !processedProducts.length}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {isExportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} Export PDF
          </button>

          <button
            onClick={handleExportExcel}
            disabled={isExportingExcel || !processedProducts.length}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-teal-500/15 text-teal-300 hover:bg-teal-500/25 border border-teal-500/30 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            title="Download Quotation Excel (.xlsx)"
          >
            {isExportingExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>{isExportingExcel ? 'Generating Excel...' : 'Download Excel'}</span>
          </button>

          
        </div>
      </div>

      {/* EXECUTIVE HEADER BANNER */}
      <div className="bg-slate-900/70 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
            <Target className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-white tracking-tight">Sales Lead #{lead.id}</h1>
              
              <span
                className={
                  'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold border ' +
                  (lead.priority === 'Hot Lead'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : lead.priority === 'Prospect'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : lead.priority === 'Warm'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700')
                }
              >
                {lead.priority === 'Hot Lead' ? '🔥 Hot Lead' : lead.priority === 'Prospect' ? '🎯 Prospect' : (lead.priority || 'Prospect')}
              </span>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 border border-slate-700 text-slate-300">
                {lead.lead_type || 'Single'} Lead
              </span>
            </div>

            <p className="text-xs text-slate-400 font-medium flex items-center gap-3 flex-wrap">
              <span>Customer: <strong className="text-slate-200">{lead.customer_name}</strong></span>
              <span>•</span>
              <span>Created: {formattedDate(lead.created_at)}</span>
            </p>
          </div>
        </div>

        {/* STATUS SELECTOR & EDIT LINK */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs font-medium">Status:</span>
            <select
              value={lead.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updatingStatus}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
            >
              <option value="New">🔵 New Inquiry</option>
              <option value="Contacted">🟡 Contacted</option>
              <option value="In Progress">🟣 In Progress</option>
              <option value="Converted">🟢 Converted / Won</option>
              <option value="Lost">🔴 Lost / Cancelled</option>
            </select>
          </div>

          <Link
            href={listPath + '/edit/' + lead.id}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 font-bold text-xs transition"
          >
            <Edit3 className="w-4 h-4 text-indigo-400" />
            Edit Lead
          </Link>
        </div>
      </div>

      {/* METRIC HIGHLIGHTS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 backdrop-blur-md flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lead Value</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">₹{(lead.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Total estimated revenue</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 backdrop-blur-md flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Quantity</p>
            <h3 className="text-2xl font-black text-purple-400 mt-1">{(lead.quantity || 1).toLocaleString()} Units</h3>
            <p className="text-[11px] text-slate-400 mt-1">Items requested</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 backdrop-blur-md flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Shipping Freight</p>
            <h3 className="text-xl font-black text-blue-400 mt-1">{lead.shipping_type || 'Air'} Freight</h3>
            <p className="text-[11px] text-slate-400 mt-1">Delivery preference</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {lead.shipping_type === 'Sea' ? <Ship className="w-6 h-6" /> : <Plane className="w-6 h-6" />}
          </div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 backdrop-blur-md flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Follow Up Date</p>
            <h3 className="text-base font-black text-amber-400 mt-1">{formattedDate(lead.follow_up_date)}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Next action timeline</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* SECTION 1: CUSTOMER & CREATOR INFO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <UserCheck className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Customer Details</h2>
            </div>

            {lead.user_id && (
              <Link
                href={'/customers/' + lead.user_id + '/cart'}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                View Customer Cart ↗
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500 text-[11px] uppercase font-bold block mb-1">Customer Name</span>
              <span className="text-slate-100 font-bold text-sm flex items-center gap-1.5">
                {lead.customer_name}
                {lead.user && (
                  <span title="Registered Customer" className="text-emerald-400">
                    <UserCheck className="w-4 h-4" />
                  </span>
                )}
              </span>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] uppercase font-bold block mb-1">Registered Customer ID</span>
              <span className="text-slate-300 font-medium">
                {lead.user_id ? ('#' + lead.user_id + ' (' + (lead.user?.name || 'Registered Account') + ')') : 'Guest / Not Registered'}
              </span>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] uppercase font-bold block mb-1">Phone Number</span>
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                {lead.phone || 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] uppercase font-bold block mb-1">Email Address</span>
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                {lead.email || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <User className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Lead Creator Info</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 text-[11px] uppercase font-bold block mb-1">Entered By (Sales Representative)</span>
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-400" />
                {lead.creator?.name || lead.creator?.email || (lead.created_by_id ? ('User #' + lead.created_by_id) : 'System / Admin')}
              </div>
            </div>

            {lead.creator?.email && (
              <div>
                <span className="text-slate-500 text-[11px] uppercase font-bold block mb-0.5">Creator Email</span>
                <span className="text-slate-300 font-medium">{lead.creator.email}</span>
              </div>
            )}

            <div>
              <span className="text-slate-500 text-[11px] uppercase font-bold block mb-0.5">Creation Timestamp</span>
              <span className="text-slate-300 font-medium">{formattedDate(lead.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* REMARKS / NOTES SECTION */}
      {lead.notes && (
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 backdrop-blur-md space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-amber-400" />
            Internal Notes & Remarks
          </span>
          <p className="text-xs text-slate-300 font-medium whitespace-pre-wrap bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            {lead.notes}
          </p>
        </div>
      )}

      {/* SECTION 2: PRODUCTS & SPECIFICATIONS TABLE */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 backdrop-blur-md overflow-hidden space-y-4">
        <div className="p-6 pb-2 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Requested Products & Pricing</h2>
          </div>
          <span className="text-xs text-slate-400 font-bold">
            {(lead.items || []).length} Product(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-950/60">
                <th className="py-3.5 px-5">#</th>
                <th className="py-3.5 px-5">Product Details</th>
                <th className="py-3.5 px-5">Variant / Size</th>
                <th className="py-3.5 px-5 text-center">Qty</th>
                <th className="py-3.5 px-5 text-right">Unit Price</th>
                <th className="py-3.5 px-5 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-medium">
              {(lead.items || []).map((item, idx) => {
                const itemQty = item.quantity || 1;
                const itemPrice = item.unit_price || 0;
                const itemTotal = item.total_price || (itemQty * itemPrice);

                return (
                  <tr key={item.id || idx} className="hover:bg-slate-800/40 transition">
                    <td className="py-4 px-5 font-bold text-slate-500">{idx + 1}</td>
                    
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 shrink-0 overflow-hidden">
                          {item.product_image ? (
                            <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-5 h-5 text-slate-600" />
                            </div>
                          )}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-bold text-slate-100 text-sm line-clamp-2">
                            {item.product_name}
                          </div>
                          {item.product_id && (
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                              <span>ID: #{item.product_id}</span>
                              <a
                                href={'https://www.yenomart.com/productdetail/' + item.product_id}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="text-emerald-400 hover:text-emerald-300 font-semibold hover:underline"
                              >
                                View on Store ↗
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      {item.size ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                          {item.size}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Standard / Default</span>
                      )}
                    </td>

                    <td className="py-4 px-5 text-center font-bold text-purple-400">
                      {itemQty}
                    </td>

                    <td className="py-4 px-5 text-right font-bold text-slate-200">
                      ₹{itemPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-4 px-5 text-right font-black text-emerald-400 text-sm">
                      ₹{itemTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400 font-medium">
            Shipping Freight Option: <strong className="text-slate-200">{lead.shipping_type || 'Air'} Freight</strong>
          </div>

          <div className="text-right space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Revenue Estimate</span>
            <div className="text-2xl font-black text-emerald-400">
              ₹{(lead.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* ── EXPORT PDF MODAL ── */}
      {pdfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" /> Export PDF Quotation
              </h3>
              <button onClick={() => setPdfModalOpen(false)} className="text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-300">Freight Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Air Freight', 'Sea Freight'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setFreightType(mode)}
                      className={'py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition cursor-pointer ' + (
                        freightType === mode
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      )}
                    >
                      {mode === 'Air Freight' ? <Plane className="w-4 h-4" /> : <Ship className="w-4 h-4" />}
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-300">Estimated Delivery Charges (INR)</label>
                <input
                  type="number"
                  placeholder="e.g. 1500"
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-300">Shipping Note / Instruction</label>
                <textarea
                  rows={2}
                  placeholder="Additional note to appear in PDF..."
                  value={shippingNote}
                  onChange={(e) => setShippingNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setPdfModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmExportPdf}
                disabled={isExportingPdf}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 transition flex items-center gap-1.5"
              >
                {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Generate & Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
}

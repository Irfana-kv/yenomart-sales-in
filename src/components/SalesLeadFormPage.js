'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Target,
  UserCheck,
  User,
  ShoppingBag,
  DollarSign,
  Plane,
  Ship,
  Sparkles,
  RefreshCw,
  XCircle,
  Save,
  CheckCircle2,
  Search,
  X,
  Plus,
  Trash2,
  ExternalLink,
  Calendar
} from 'lucide-react';

export default function SalesLeadFormPage({ leadId = null, isAdmin = false }) {
  const router = useRouter();
  const listPath = isAdmin ? '/adminpanel/sales-leads' : '/sales-leads';

  const [loading, setLoading] = useState(Boolean(leadId));
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Customer options & Product search state
  const [currentUser, setCurrentUser] = useState(null);
  const [creatorUser, setCreatorUser] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const dropdownRef = React.useRef(null);

  // Helper to create blank item
  const createEmptyItem = (overrides = {}) => ({
    key: String(Date.now() + Math.random()),
    product_id: '',
    product_sku_id: null,
    product_name: '',
    product_image: '',
    size: '',
    quantity: 1,
    unit_price: '',
    total_price: '',
    selectedProduct: null,
    selectedVariant: null,
    availableVariants: [],
    ...overrides
  });

  // Multiple Product Items state
  const [items, setItems] = useState([createEmptyItem()]);

  // Form Customer & General State
  const [formData, setFormData] = useState({
    user_id: '',
    customer_name: '',
    email: '',
    phone: '',
    shipping_type: 'Air',
    lead_type: 'Single',
    priority: 'Hot Lead',
    follow_up_date: '',
    status: 'New',
    notes: '',
    total_price: ''
  });

  // Fetch logged in user & customer catalog
  useEffect(() => {
    const fetchData = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();
        if (meData?.user) setCurrentUser(meData.user);

        const custRes = await fetch('/api/sales/customers');
        const custData = await custRes.json();
        if (Array.isArray(custData)) setCustomers(custData);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };
    fetchData();
  }, []);

  // Live product search debounced API fetch
  useEffect(() => {
    if (!productSearch || productSearch.trim().length < 2) {
      setProductResults([]);
      setSearchingProducts(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingProducts(true);
      try {
        const res = await fetch(`/api/sales/products?q=${encodeURIComponent(productSearch.trim())}&limit=12`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setProductResults(data);
          setShowProductDropdown(true);
        }
      } catch (err) {
        console.error('Failed to search products catalog:', err);
      } finally {
        setSearchingProducts(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [productSearch]);

  // Click outside listener for product search dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch lead data if editing existing lead
  useEffect(() => {
    if (!leadId) return;

    const fetchLead = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/sales/leads?id=${leadId}`);
        const data = await res.json();
        if (data.lead) {
          const l = data.lead;
          if (l.creator) setCreatorUser(l.creator);
          setFormData({
            user_id: l.user_id ? String(l.user_id) : '',
            customer_name: l.customer_name || '',
            email: l.email || '',
            phone: l.phone || '',
            shipping_type: l.shipping_type || 'Air',
            lead_type: l.lead_type || 'Single',
            priority: l.priority || 'Prospect',
            follow_up_date: l.follow_up_date ? new Date(l.follow_up_date).toISOString().split('T')[0] : '',
            status: l.status || 'New',
            notes: l.notes || '',
            total_price: l.total_price !== undefined && l.total_price !== null ? String(l.total_price) : ''
          });

          if (Array.isArray(l.items) && l.items.length > 0) {
            const loadedItems = l.items.map((it) =>
              createEmptyItem({
                product_id: it.product_id || '',
                product_sku_id: it.product_sku_id || null,
                product_name: it.product_name || '',
                product_image: it.product_image || '',
                size: it.size || '',
                quantity: it.quantity || 1,
                unit_price: it.unit_price !== undefined && it.unit_price !== null ? String(it.unit_price) : '',
                total_price: it.total_price !== undefined && it.total_price !== null ? String(it.total_price) : ''
              })
            );

            setItems(loadedItems);

            // Async load selected product info and variants for tier cards & dropdowns
            loadedItems.forEach((itemObj, idx) => {
              if (itemObj.product_id) {
                fetch(`/api/sales/products?q=${encodeURIComponent(itemObj.product_id)}&limit=1`)
                  .then((r) => r.json())
                  .then((prods) => {
                    if (Array.isArray(prods) && prods.length > 0) {
                      const prodObj = prods[0];
                      const vars = prodObj.variants || [];
                      const matchedVariant = vars.find(
                        (v) => (itemObj.product_sku_id && String(v.id) === String(itemObj.product_sku_id)) ||
                               v.name === itemObj.size ||
                               String(v.skuId || v.id) === String(itemObj.size)
                      ) || vars[0] || null;

                      setItems((prev) => {
                        const next = [...prev];
                        if (next[idx]) {
                          next[idx] = {
                            ...next[idx],
                            selectedProduct: prodObj,
                            selectedVariant: matchedVariant,
                            availableVariants: vars
                          };
                        }
                        return next;
                      });
                    }
                  })
                  .catch(() => null);
              }
            });
          } else {
            const leadItem = createEmptyItem();
            setItems([leadItem]);
          }
        } else {
          setErrorMsg('Lead not found.');
        }
      } catch (err) {
        console.error('Failed to fetch lead:', err);
        setErrorMsg('Failed to load lead data.');
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [leadId]);

  // Tier pricing unit price lookup
  const getTierUnitPrice = (targetObj, qtyVal) => {
    if (!targetObj || !targetObj.pricing_tiers || targetObj.pricing_tiers.length === 0) return null;
    const qty = parseInt(qtyVal || '1', 10);
    const sortedTiers = [...targetObj.pricing_tiers].sort((a, b) => b.minQty - a.minQty);
    const matched = sortedTiers.find((t) => qty >= t.minQty) || targetObj.pricing_tiers[0];
    return matched ? String(matched.unitPrice) : null;
  };

  // Add selected catalog product to items list
  const addCatalogProductToItems = (p) => {
    const qtyNum = 1;
    const variants = p.variants || [];
    const firstVariant = variants.length > 0 ? variants[0] : null;

    const activeObj = firstVariant || p;
    const tierPrice = getTierUnitPrice(activeObj, 1);
    const priceStr = tierPrice || (activeObj.price !== undefined ? String(activeObj.price) : '0');
    const priceNum = parseFloat(priceStr || '0');
    const autoTotal = (priceNum * qtyNum).toFixed(2);

    const newItem = createEmptyItem({
      product_id: String(p.id),
      product_sku_id: firstVariant ? firstVariant.id : null,
      product_name: p.en_title || p.title || '',
      product_image: firstVariant?.image || p.image || '',
      size: firstVariant ? firstVariant.name : '',
      quantity: 1,
      unit_price: priceStr,
      total_price: autoTotal,
      selectedProduct: p,
      selectedVariant: firstVariant,
      availableVariants: variants
    });

    setItems((prev) => {
      if (prev.length === 1 && !prev[0].product_name.trim() && !prev[0].product_id) {
        return [newItem];
      }
      return [...prev, newItem];
    });

    setShowProductDropdown(false);
    setProductSearch('');
  };

  // Update item field in items array
  const updateItemField = (index, field, value) => {
    setItems((prevItems) => {
      const newItems = [...prevItems];
      const item = { ...newItems[index], [field]: value };

      if (field === 'variant') {
        const selectedVar = (item.availableVariants || []).find(
          (v) => String(v.skuId || v.id) === String(value) || v.name === value
        );
        if (selectedVar) {
          item.selectedVariant = selectedVar;
          item.product_sku_id = selectedVar.id || null;
          item.size = selectedVar.name;
          if (selectedVar.image) item.product_image = selectedVar.image;

          const tierPrice = getTierUnitPrice(selectedVar, item.quantity) || String(selectedVar.price || '0');
          item.unit_price = tierPrice;

          const qty = parseInt(item.quantity || '0', 10);
          const price = parseFloat(tierPrice || '0');
          item.total_price = isNaN(qty) || isNaN(price) ? '' : (qty * price).toFixed(2);
        }
      } else if (field === 'quantity') {
        const qtyVal = value;
        const qty = parseInt(qtyVal || '0', 10);
        let newUnitPrice = item.unit_price;

        const activeObj = item.selectedVariant || item.selectedProduct;
        if (activeObj) {
          const tierPrice = getTierUnitPrice(activeObj, qtyVal);
          if (tierPrice) newUnitPrice = tierPrice;
        }

        const price = parseFloat(newUnitPrice || '0');
        const autoItemTotal = isNaN(qty) || isNaN(price) ? '' : (qty * price).toFixed(2);
        item.unit_price = newUnitPrice;
        item.total_price = autoItemTotal;
      } else if (field === 'unit_price') {
        const price = parseFloat(value || '0');
        const qty = parseInt(item.quantity || '0', 10);
        item.total_price = isNaN(qty) || isNaN(price) ? '' : (qty * price).toFixed(2);
      }

      newItems[index] = item;
      return newItems;
    });
  };

  // Remove item
  const removeItem = (index) => {
    if (items.length === 1) {
      setItems([createEmptyItem()]);
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Add empty item row
  const addEmptyItem = () => {
    setItems((prev) => [...prev, createEmptyItem()]);
  };

  // Calculate combined totals across all selected products
  const autoCalculatedTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = parseInt(item.quantity || '0', 10);
      const price = parseFloat(item.unit_price || '0');
      const itemTotal = item.total_price !== '' && !isNaN(parseFloat(item.total_price))
        ? parseFloat(item.total_price)
        : (isNaN(qty) || isNaN(price) ? 0 : qty * price);
      return sum + itemTotal;
    }, 0);
  }, [items]);

  const totalQuantitySum = useMemo(() => {
    return items.reduce((sum, item) => sum + (parseInt(item.quantity || '0', 10) || 0), 0);
  }, [items]);

  const effectiveTotal = useMemo(() => {
    if (formData.total_price !== '' && formData.total_price !== null && !isNaN(parseFloat(formData.total_price))) {
      return parseFloat(formData.total_price);
    }
    return autoCalculatedTotal;
  }, [formData.total_price, autoCalculatedTotal]);

  const isCustomTotal = useMemo(() => {
    if (formData.total_price === '' || formData.total_price === null) return false;
    const customVal = parseFloat(formData.total_price);
    if (isNaN(customVal)) return false;
    return Math.abs(customVal - autoCalculatedTotal) > 0.001;
  }, [formData.total_price, autoCalculatedTotal]);

  const handleCustomerSelect = (e) => {
    const custId = e.target.value;
    if (!custId) {
      setFormData((prev) => ({ ...prev, user_id: '' }));
      return;
    }
    const selected = customers.find((c) => String(c.id) === String(custId));
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        user_id: String(selected.id),
        customer_name: selected.name || prev.customer_name,
        email: selected.email || prev.email,
        phone: selected.phone || prev.phone
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer_name.trim()) {
      setErrorMsg('Please enter customer name');
      return;
    }

    const validItems = items.filter((i) => i.product_name && i.product_name.trim());
    if (validItems.length === 0) {
      setErrorMsg('Please add at least one product with a valid product name');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const endpoint = '/api/sales/leads';
      const method = leadId ? 'PATCH' : 'POST';

      const payload = {
        ...(leadId ? { id: leadId } : {}),
        ...formData,
        total_price: effectiveTotal,
        items: validItems.map((item) => ({
          product_id: item.product_id,
          product_sku_id: item.product_sku_id || item.selectedVariant?.id || null,
          product_name: item.product_name,
          product_image: item.product_image,
          size: item.size,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        }))
      };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save lead');
      }

      router.push(listPath);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400 mb-3" />
        <p className="text-sm font-medium">Loading sales lead details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* NAVIGATION BACK HEADER */}
      <div className="flex items-center justify-between">
        <Link
          href={listPath}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sales Leads
        </Link>

        <div className="text-xs text-slate-400 font-medium">
          {leadId ? `Editing Lead #${leadId}` : 'New Lead Entry'}
        </div>
      </div>

      {/* PAGE TITLE BANNER */}
      <div className="bg-slate-900/70 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Target className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {leadId ? 'Edit Sales Lead' : 'Create New Sales Lead'}
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              {leadId
                ? 'Modify lead parameters, pricing, and status updates'
                : 'Enter customer details and select multiple product specifications, pricing, and shipping preferences'}
            </p>
          </div>
        </div>

        {/* ENTERED BY USER BADGE */}
        {(creatorUser || currentUser) && (
          <div className="px-3.5 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-400" />
            <div>
              <span className="text-slate-400 text-[10px] block font-normal">Entered By (Sales Representative)</span>
              <span className="font-bold text-slate-100">
                {creatorUser?.name || creatorUser?.email || currentUser?.name || currentUser?.email || 'Sales User'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ERROR ALERT */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2.5">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* MAIN FORM */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: CUSTOMER DETAILS */}
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <UserCheck className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              1. Customer Information
            </h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Registered Customer (Auto-fills customer fields)
            </label>
            <select
              value={formData.user_id}
              onChange={handleCustomerSelect}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-slate-200 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">-- Select Customer from Database (Optional) --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || 'Unnamed'} ({c.phone || c.email || `ID #${c.id}`})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Customer Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Full Name"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-slate-100 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Phone Number</label>
              <input
                type="text"
                placeholder="+91 9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-slate-100 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                placeholder="customer@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-slate-100 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: PRODUCT & VARIANT DETAILS (MULTIPLE PRODUCTS) */}
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-md space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                2. Products & Variant Details
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
              {items.length} Product{items.length > 1 ? 's' : ''} Selected
            </span>
          </div>

          {/* SEARCH PRODUCT CATALOG TO ADD ITEM */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Search & Add Products from Catalog (Type product title or ID)
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Type to search and click a product to add to lead..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  if (!showProductDropdown) setShowProductDropdown(true);
                }}
                onFocus={() => {
                  if (productResults.length > 0) setShowProductDropdown(true);
                }}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-slate-100 focus:outline-none focus:border-teal-500/50 transition placeholder:text-slate-500"
              />

              {searchingProducts && (
                <RefreshCw className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-400 animate-spin" />
              )}

              {/* SEARCH RESULTS DROPDOWN POPUP */}
              {showProductDropdown && productSearch.trim().length >= 2 && (
                <div className="absolute z-30 top-full left-0 right-0 mt-1.5 max-h-72 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl shadow-2xl divide-y divide-slate-900 scrollbar-none">
                  {searchingProducts ? (
                    <div className="p-4 text-center text-xs text-slate-400 font-medium">
                      Searching products catalog...
                    </div>
                  ) : productResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 font-medium">
                      No products found matching "{productSearch}".
                    </div>
                  ) : (
                    productResults.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => addCatalogProductToItems(p)}
                        className="p-3 hover:bg-slate-900/80 cursor-pointer transition flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.title}
                              className="w-10 h-10 rounded-lg object-cover bg-slate-900 border border-slate-800 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0">
                              <ShoppingBag className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-200 group-hover:text-teal-300 transition line-clamp-2">
                              {p.en_title || p.title}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-1 flex-wrap">
                              <span className="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">
                                SKU: #{p.variants?.[0]?.skuId || p.id}
                              </span>
                              <span>•</span>
                              <span className="text-emerald-400 font-bold">₹{p.price}</span>
                              {p.variants && p.variants.length > 0 && (
                                <span className="text-teal-400 font-bold">• {p.variants.length} Variants</span>
                              )}
                              <a
                                href={`https://www.yenomart.com/productdetail/${p.id}`}
                                target="_blank"
                                rel="noreferrer noopener"
                                onClick={(e) => e.stopPropagation()}
                                className="text-emerald-400 hover:text-emerald-300 font-semibold hover:underline inline-flex items-center gap-0.5 ml-1"
                              >
                                View on Yenomart <ExternalLink className="w-3 h-3 inline" />
                              </a>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[11px] font-bold border border-emerald-500/20 group-hover:bg-emerald-500/20 transition flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5" /> Add Product
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* LIST OF SELECTED PRODUCT ITEMS */}
          <div className="space-y-4 pt-2">
            {items.map((item, idx) => {
              const activePricingObj = item.selectedVariant || item.selectedProduct;
              const hasVariants = item.availableVariants && item.availableVariants.length > 0;

              return (
                <div
                  key={item.key || idx}
                  className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-4 relative shadow-md"
                >
                  {/* ITEM HEADER & RICH PRODUCT DETAILS */}
                  <div className="flex items-start justify-between border-b border-slate-800/80 pb-3 gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 text-xs font-black border border-slate-800 flex-shrink-0 mt-0.5">
                        Item #{idx + 1}
                      </span>
                      {item.product_image ? (
                        <img
                          src={item.product_image}
                          alt="Thumbnail"
                          className="w-12 h-12 rounded-xl object-cover bg-slate-900 border border-slate-800 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0">
                          <ShoppingBag className="w-6 h-6" />
                        </div>
                      )}
                      <div className="min-w-0 space-y-1">
                        {/* Full Product Title */}
                        <div className="text-xs font-bold text-white leading-snug break-words">
                          {item.selectedProduct?.en_title || item.selectedProduct?.title || item.product_name || 'Custom Product Specification'}
                        </div>

                        {/* Variant Badge */}
                        {(item.selectedVariant?.name || item.size) && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                              <span className="font-bold text-emerald-500 text-[10px] uppercase tracking-wide">Variant:</span>
                              <span className="break-words">
                                {item.selectedVariant?.name || item.size}
                              </span>
                            </span>
                          </div>
                        )}

                        {/* SKU & View on Yenomart link */}
                        <div className="text-[11px] text-slate-400 font-medium flex items-center gap-2 flex-wrap pt-0.5">
                          <span className="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">
                            SKU: #{item.selectedVariant?.skuId || item.product_sku_id || item.selectedVariant?.id || item.product_id || 'N/A'}
                          </span>

                          {item.product_id && (
                            <a
                              href={`https://www.yenomart.com/productdetail/${item.product_id}`}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="text-emerald-400 hover:text-emerald-300 font-semibold hover:underline inline-flex items-center gap-1 text-[11px]"
                            >
                              View on Yenomart <ExternalLink className="w-3 h-3 inline" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                          title="Remove product item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ITEM FIELDS GRID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Product Title / Name <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Product name"
                        value={item.product_name}
                        onChange={(e) => updateItemField(idx, 'product_name', e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-medium text-slate-100 focus:outline-none focus:border-teal-500/50"
                      />
                    </div>

                    {/* VARIANT DROPDOWN (IF VARIANTS AVAILABLE) OR TEXT INPUT */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Variant / Specification {hasVariants && `(${item.availableVariants.length})`}
                      </label>
                      {hasVariants ? (
                        <select
                          value={item.selectedVariant?.skuId || item.selectedVariant?.id || item.size || ''}
                          onChange={(e) => updateItemField(idx, 'variant', e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-900 border border-teal-500/40 rounded-xl text-xs font-bold text-teal-300 focus:outline-none focus:border-teal-400"
                        >
                          {item.availableVariants.map((v) => (
                            <option key={v.skuId || v.id} value={v.skuId || v.id}>
                              {v.name} (₹{v.price})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder="e.g. XL, Blue"
                          value={item.size}
                          onChange={(e) => updateItemField(idx, 'size', e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-medium text-slate-100 focus:outline-none focus:border-teal-500/50"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => updateItemField(idx, 'quantity', e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-medium text-slate-100 focus:outline-none focus:border-teal-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Unit Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="0.00"
                        value={item.unit_price}
                        onChange={(e) => updateItemField(idx, 'unit_price', e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-medium text-slate-100 focus:outline-none focus:border-teal-500/50"
                      />
                    </div>
                  </div>

                  {/* TIER PRICING QUICK-SELECT TIERS */}
                  {activePricingObj?.pricing_tiers && activePricingObj.pricing_tiers.length > 0 && (
                    <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-2">
                      <div className="text-[11px] font-bold text-slate-300">
                        Bulk Pricing Tiers (Click to select quantity & tier price):
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {activePricingObj.pricing_tiers.map((t, tIdx) => {
                          const qtyNum = parseInt(item.quantity || '1', 10);
                          const isActive =
                            qtyNum >= t.minQty &&
                            (!activePricingObj.pricing_tiers[tIdx + 1] || qtyNum < activePricingObj.pricing_tiers[tIdx + 1].minQty);

                          return (
                            <div
                              key={t.key || tIdx}
                              onClick={() => {
                                updateItemField(idx, 'quantity', t.minQty);
                                updateItemField(idx, 'unit_price', String(t.unitPrice));
                              }}
                              className={`p-2 rounded-lg border text-xs cursor-pointer transition ${
                                isActive
                                  ? 'bg-emerald-500/10 border-emerald-500/50 text-white font-bold'
                                  : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <span>{t.label} (≥ {t.minQty})</span>
                                {isActive && <span className="text-[9px] text-emerald-400 uppercase font-black">Active</span>}
                              </div>
                              <div className="text-xs font-black text-emerald-400 mt-0.5">
                                ₹{t.unitPrice} / unit
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}


                </div>
              );
            })}
          </div>

          {/* ADD ITEM BUTTON */}
          <button
            type="button"
            onClick={addEmptyItem}
            className="w-full py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-bold text-xs transition flex items-center justify-center gap-2 border-dashed"
          >
            <Plus className="w-4 h-4 text-emerald-400" /> Add Custom Product Item
          </button>
        </div>

        {/* SECTION 3: PRICING, QUANTITY & SHIPPING */}
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-md space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              3. Lead Classification, Pricing & Shipping
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. LEAD TYPE (SINGLE OR BULK) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Lead Type (Single / Bulk)
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl h-[42px]">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, lead_type: 'Single' })}
                  className={`flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition ${
                    formData.lead_type === 'Single'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  👤 Single
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, lead_type: 'Bulk' })}
                  className={`flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition ${
                    formData.lead_type === 'Bulk'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  📦 Bulk
                </button>
              </div>
            </div>

            {/* 2. PRIORITY FIELD (HOT LEADS / PROSPECTS) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Priority & Quality
              </label>
              <select
                value={formData.priority || 'Hot Lead'}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-500/50 h-[42px]"
              >
                <option value="Hot Lead">🔥 Hot Lead</option>
                <option value="Prospect">🎯 Prospect</option>
                <option value="Warm">⚡ Warm</option>
                <option value="Cold">❄️ Cold</option>
              </select>
            </div>

            {/* 3. FOLLOW UP DATE */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Follow Up Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={formData.follow_up_date || ''}
                  onClick={(e) => e.target.showPicker && e.target.showPicker()}
                  onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-slate-100 focus:outline-none focus:border-purple-500/50 h-[42px] cursor-pointer [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Shipping Type</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl h-[42px]">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, shipping_type: 'Air' })}
                  className={`flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition ${
                    formData.shipping_type === 'Air'
                      ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Plane className="w-3.5 h-3.5" /> Air
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, shipping_type: 'Sea' })}
                  className={`flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition ${
                    formData.shipping_type === 'Sea'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Ship className="w-3.5 h-3.5" /> Sea
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Pipeline Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-slate-200 focus:outline-none focus:border-purple-500/50"
              >
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="In Progress">In Progress</option>
                <option value="Converted">Converted</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
          </div>

          {/* TOTAL LEAD AMOUNT CARD SECTION */}
          <div className="p-5 bg-slate-950 rounded-2xl border border-emerald-500/30 space-y-3 shadow-lg shadow-emerald-950/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left Column: Title & Auto-Calculated Details */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wide">
                    Total Lead Amount
                  </h3>
                  {isCustomTotal ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Custom Override
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Auto-Calculated
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-xs">
                  <div className="text-slate-300">
                    <span className="font-semibold text-slate-400">Auto Calculated Amount:</span>{' '}
                    <span className="font-black text-emerald-300">
                      ₹{autoCalculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-2">
                      ({items.length} Product{items.length > 1 ? 's' : ''} | Total {totalQuantitySum} units)
                    </span>
                  </div>

                  {isCustomTotal && (
                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, total_price: autoCalculatedTotal.toFixed(2) }))}
                        className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-bold underline transition"
                        title="Reset total amount back to auto-calculated default"
                      >
                        <RefreshCw className="w-3 h-3" /> Reset to Auto Calculated (₹{autoCalculatedTotal.toFixed(2)})
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Editable Total Amount Input */}
              <div className="flex flex-col sm:items-end gap-1 min-w-[240px]">
                <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  Edit Total Amount (₹)
                </label>
                <div className="relative w-full sm:w-60">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm pointer-events-none">
                    ₹
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={autoCalculatedTotal ? autoCalculatedTotal.toFixed(2) : '0.00'}
                    value={formData.total_price !== '' ? formData.total_price : (autoCalculatedTotal ? autoCalculatedTotal.toFixed(2) : '')}
                    onChange={(e) => setFormData({ ...formData, total_price: e.target.value })}
                    className={`w-full pl-8 pr-4 py-2.5 bg-slate-900 border rounded-xl text-base font-black text-right focus:outline-none transition ${
                      isCustomTotal
                        ? 'border-amber-500/80 text-amber-300 focus:border-amber-400 shadow-md shadow-amber-500/10'
                        : 'border-emerald-500/60 text-emerald-400 focus:border-emerald-400 shadow-md shadow-emerald-500/10'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: AGENT NOTES */}
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Target className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              4. Agent Notes & Remarks
            </h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Agent Notes / Special Requests</label>
            <textarea
              rows={3}
              placeholder="Special customer requests, negotiation notes, custom packaging requirements..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-slate-100 focus:outline-none focus:border-purple-500/50"
            />
          </div>
        </div>

        {/* SUBMIT ACTIONS BAR */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href={listPath}
            className="px-6 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition text-xs font-bold"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 active:scale-[0.98]"
          >
            {submitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {leadId ? 'Update Lead' : 'Save & Submit Lead'}
          </button>
        </div>
      </form>
    </div>
  );
}

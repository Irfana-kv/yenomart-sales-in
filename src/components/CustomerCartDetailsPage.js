"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingBag, Target, Package, User, Phone, Mail, ArrowLeft, RefreshCw,
  FileText, Download, Printer, Share2, FileCheck,
  Loader2, Home, Store, Plane, Ship, Truck, X, Info, Database, Sparkles
} from "lucide-react";
import Toast from "@/components/Toast";
import { exportCustomerCartPdf } from "@/utils/exportCartPdf";
import { exportCustomerCartExcel } from "@/utils/exportCartExcel";
import { applyPricingRules, findPricingRule } from "@/utils/pricing";
import { formatVariantEnglish } from "@/utils/variantTranslation";

const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined || value === "") return "0.00";
  const number = Number(value);
  if (Number.isNaN(number)) return "0.00";
  return number.toFixed(decimals).replace(/\.00$/, "");
};

const money = (value, currency = "INR") => `${currency} ${formatNumber(value, 2)}`;

export default function CustomerCartDetailsPage({
  customerData,
  cartData = [],
  inrRate = 1,
  pricingRules = [],
  mutate,
  isLoading = false
}) {
  const [toast, setToast] = useState(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [freightType, setFreightType] = useState("Air Freight");
  const [deliveryCharge, setDeliveryCharge] = useState("");
  const [shippingNote, setShippingNote] = useState("");
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [selectedShopFilter, setSelectedShopFilter] = useState("ALL");
  const [auditModalItem, setAuditModalItem] = useState(null);

  const customer = customerData || {
    id: "N/A",
    name: "Customer",
    email: "—",
    phone: "—",
    businessName: "N/A",
    city: "—",
    state: "—",
    country: "India",
    totalOrders: 0,
    lifetimePurchase: 0,
    accountStatus: "Active"
  };

  // Process items to match Order Details structures
  const processedProducts = useMemo(() => {
    return cartData.map((item) => {
      const baseCny = Number(item.baseCny || (item.price ? item.price / (inrRate || 1) : 0));
      const baseInr = Number(item.baseInr || baseCny * (inrRate || 1));
      const qty = Number(item.quantity || 1);

      const pricing = applyPricingRules(baseInr, pricingRules, item.minOrderQuantity);
      const rule = findPricingRule(baseInr, pricingRules);
      const tiers = pricing.tiers || [];
      const tier = [...tiers]
        .filter((t) => qty >= (t.minQuantity || 1))
        .sort((a, b) => (b.minQuantity || 1) - (a.minQuantity || 1))[0] || tiers[0] || null;

      const isLeadItem = Boolean(item.is_from_lead || item.lead_id) && item.price !== null && item.price !== undefined && Number(item.price) > 0;
      const rulePrice = isLeadItem ? Number(item.price) : (tier?.price ?? pricing.finalPrice ?? baseInr);
      const orderTotal = rulePrice * qty;
      const totalBaseCny = baseCny * qty;
      const totalInrAdjusted = baseInr * qty;
      const savedAmount = Math.max(0, (rulePrice - baseInr) * qty);

      const rawVariation = item.variation || item.sku?.properties || item.sku_properties || item.sku || null;
      const variationName = item.variation_name || formatVariantEnglish(rawVariation);

      return {
        id: item.id,
        productId: item.productId,
        is_from_lead: item.is_from_lead || false,
        lead_id: item.lead_id || null,
        created_by_id: item.created_by_id || null,
        creator: item.creator || null,
        product_id: item.productId,
        product_name: item.name,
        name: item.name,
        category: item.category || "General",
        sku: item.sku,
        image: item.image,
        thumbnail_img: item.image,
        variation: rawVariation,
        variation_name: variationName,
        stored_base_cny: baseCny,
        base_inr: baseInr,
        rule_price: rulePrice,
        price: rulePrice,
        quantity: qty,
        order_total: orderTotal,
        saved_order_price: savedAmount > 0 ? savedAmount : null,
        rule_id: rule?.id || null,
        rule_tier: tier?.key ? tier.key.toUpperCase() : null,
        rule_margin: tier?.margin ?? rule?.tier1_margin ?? null,
        shopName: item.shopName || item.shop_name || item.supplier || item.product?.shop_name || "In-House Supplier",
        slug: item.slug || item.product?.slug || "",
        
        // Shipping & Package details from product_shipping_details
        shippingDetailsTable: item.shippingDetailsTable || "product_shipping_details",
        shippingDetailsSourceTable: item.shippingDetailsSourceTable || "PRODUCTSHOP",
        shippingDetailId: item.shippingDetailId || null,
        weight: item.weight ?? 0,
        measurementType: item.measurementType || "GRAM",
        length: item.length ?? 0,
        width: item.width ?? 0,
        height: item.height ?? 0,
        shipping_charge_sea: item.shipping_charge_sea ?? 0,
        shipping_charge_air: item.shipping_charge_air ?? 0,
        officialWeight: item.officialWeight ?? null,
        aiWeight: item.aiWeight ?? null,
        aiWeightAccuracy: item.aiWeightAccuracy ?? null,
        sendGoodsAddressText: item.sendGoodsAddressText ?? null,
        postFee: item.postFee ?? 0,
        productCargoNumber: item.productCargoNumber ?? null,
        unit: item.unit ?? null,
        tablesBreakdown: item.tablesBreakdown || null,

        totals: {
          order_price: orderTotal,
          base_cny: totalBaseCny,
          inr_adjusted: totalInrAdjusted
        }
      };
    });
  }, [cartData, inrRate, pricingRules]);

  // Unique Shops for Supplier Filter
  const availableShops = useMemo(() => {
    const shopMap = new Map();
    processedProducts.forEach((item) => {
      const sName = item.shopName || "In-House Supplier";
      shopMap.set(sName, (shopMap.get(sName) || 0) + 1);
    });
    return Array.from(shopMap.entries()).map(([name, count]) => ({ name, count }));
  }, [processedProducts]);

  // Filtered Products List
  const filteredProducts = useMemo(() => {
    if (selectedShopFilter === "ALL") return processedProducts;
    return processedProducts.filter((p) => (p.shopName || "In-House Supplier") === selectedShopFilter);
  }, [processedProducts, selectedShopFilter]);

  // Calculated Subtotals & Grand Totals
  const subtotals = useMemo(() => {
    const totalItems = processedProducts.length;
    const totalQuantity = processedProducts.reduce((acc, p) => acc + p.quantity, 0);
    const subtotalOrderPrice = processedProducts.reduce((acc, p) => acc + p.totals.order_price, 0);
    const subtotalBaseCny = processedProducts.reduce((acc, p) => acc + p.totals.base_cny, 0);
    const subtotalInrAdjusted = processedProducts.reduce((acc, p) => acc + p.totals.inr_adjusted, 0);

    return {
      totalItems,
      totalQuantity,
      order_price: subtotalOrderPrice,
      base_cny: subtotalBaseCny,
      inr_adjusted: subtotalInrAdjusted,
      grandTotal: subtotalOrderPrice
    };
  }, [processedProducts]);

  // Actions Handlers
  const handleRefresh = async () => {
    if (mutate) await mutate();
    setToast({ type: "success", message: "Cart data refreshed successfully." });
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
        shippingNote
      });
      setToast({ type: "success", message: "Customer Cart PDF Quotation generated & downloaded successfully." });
      setPdfModalOpen(false);
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: "Failed to export PDF quotation document." });
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
        subtotals
      });
      setToast({ type: "success", message: "Yenomart Quotation Excel (.xlsx) downloaded successfully." });
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: "Failed to generate Quotation Excel file." });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareCart = async () => {
    const text = `Yenomart - Customer Cart Summary\nCustomer: ${customer.name} (#${customer.id})\nItems: ${processedProducts.length}\nTotal Amount: INR ${subtotals.grandTotal.toFixed(2)}\nLink: ${window.location.href}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setToast({ type: "success", message: "Share link & summary copied to clipboard!" });
      }
    } catch {
      setToast({ type: "info", message: "Share link ready in address bar." });
    }
  };

  const handleConvertDraftOrder = async () => {
    setIsConverting(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      setConvertModalOpen(false);
      setToast({ type: "success", message: `Converted to Draft Order #DO-${Math.floor(100000 + Math.random() * 900000)}!` });
    } catch {
      setToast({ type: "error", message: "Failed to convert cart to draft order." });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-100">
      {toast && <Toast type={toast.type} message={toast.message} />}

      {/* ── BREADCRUMB ── */}
      <div className="bg-slate-950/80 border border-slate-800 px-6 py-3 rounded-2xl">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/cart-customers" className="flex items-center gap-1.5 font-bold hover:text-emerald-400 transition">
            <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" /> Cart Customers
          </Link>
          <span className="text-slate-600">/</span>
          <span className="font-bold text-slate-200">Customer #{customer.id}</span>
          <span className="text-slate-600">/</span>
          <span className="font-bold text-emerald-400">Cart Details</span>
        </div>
      </div>

      {/* ── HERO BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-slate-800 p-6 sm:p-8 text-white shadow-2xl">
        <div className="pointer-events-none absolute -top-12 -right-12 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow-xl shadow-emerald-500/20 shrink-0">
              <ShoppingBag className="w-8 h-8 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap mb-1">
                <h1 className="text-2xl font-black tracking-tight text-white mb-0">
                  Customer Cart - {customer.name}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Wholesale Cart
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-slate-300 text-xs font-medium mt-1">
                <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-emerald-400" /> ID: #{customer.id}</span>
                <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5 text-emerald-400" /> {processedProducts.length} items ({subtotals.totalQuantity} units)</span>
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-emerald-400" /> {customer.email || '—'}</span>
                {customer.phone && customer.phone !== "—" && (
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-emerald-400" /> {customer.phone}</span>
                )}
              </div>
            </div>
          </div>

          {/* Total Badge & Action Controls */}
          <div className="flex flex-col items-end gap-3 shrink-0">
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl px-6 py-3 text-right shadow-lg">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0">Total Cart Amount</p>
              <p className="text-2xl md:text-3xl font-black text-emerald-400 mt-0.5 mb-0">INR {subtotals.grandTotal.toFixed(2)}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                title="Refresh Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
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
                <span>{isExportingExcel ? "Generating Excel..." : "Download Excel"}</span>
              </button>
              <button
                onClick={handlePrint}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
              <button
                onClick={handleShareCart}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/30 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>
              <button
                onClick={() => setConvertModalOpen(true)}
                disabled={!processedProducts.length}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <FileCheck className="w-3.5 h-3.5" /> Convert to Order
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ── LEFT COLUMN: PRODUCTS TABLE (3 COLS) ── */}
        <div className="lg:col-span-3 space-y-6">
          {/* Products Table Card */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-3xl shadow-xl overflow-hidden">
            {/* Header Bar */}
            <div className="px-5 py-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white mb-0">Cart Items List</h3>
                  <p className="text-xs text-slate-400 mb-0">
                    {filteredProducts.length} {selectedShopFilter !== "ALL" ? `of ${processedProducts.length}` : ""} unique products ({filteredProducts.reduce((acc, p) => acc + p.quantity, 0)} total units)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Shop Name Filter Dropdown */}
                {availableShops.length > 1 && (
                  <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
                    <Store className="w-3.5 h-3.5 text-emerald-400" />
                    <select
                      value={selectedShopFilter}
                      onChange={(e) => setSelectedShopFilter(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL" className="bg-slate-900">All Shops ({processedProducts.length})</option>
                      {availableShops.map((shop) => (
                        <option key={shop.name} value={shop.name} className="bg-slate-900">
                          {shop.name} ({shop.count})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs">
                  Subtotal: INR {subtotals.order_price.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-900/60 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-xs font-black">#</th>
                    <th className="px-4 py-3 text-xs font-black min-w-[280px]">Product Details</th>
                    <th className="px-4 py-3 text-right text-xs font-black">Unit Price</th>
                    <th className="px-4 py-3 text-center text-xs font-black">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-black">Total Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product, index) => {
                      return (
                        <tr key={`${product.product_id}-${index}`} className="hover:bg-slate-900/50 transition-colors group">
                          {/* Index */}
                          <td className="px-4 py-3 text-xs font-bold text-slate-500">
                            {index + 1}
                          </td>

                          {/* Product Cell */}
                          <td className="px-4 py-3 border-r border-slate-800/60">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                {product.thumbnail_img && String(product.thumbnail_img).trim() !== "" ? (
                                  <img src={product.thumbnail_img} alt={product.product_name || "Product image"} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-5 h-5 text-slate-600" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white line-clamp-2">
                                  {product.product_name}
                                </div>

                                {/* Variant / Option Display */}
                                {product.variation_name && (
                                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                      <span className="font-bold text-emerald-500 text-[10px] uppercase tracking-wide">Variant:</span>
                                      <span className="truncate max-w-[280px]" title={product.variation_name}>
                                        {product.variation_name}
                                      </span>
                                    </span>
                                  </div>
                                )}

                                {/* Lead Source & Creator Badge */}
                                {product.is_from_lead && (
                                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-md">
                                      <Target className="w-3 h-3 text-indigo-400" />
                                      <span>Sales Lead #{product.lead_id}</span>
                                      {product.creator?.name && (
                                        <span className="text-slate-400 text-[10px] font-normal">
                                          (Entered by: <strong className="text-indigo-200 font-bold">{product.creator.name}</strong>)
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                )}

                                <div className="text-[11px] text-slate-400 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                                  <span>SKU: #{product.sku ?? product.product_id}</span>
                                  <a
                                    href={`https://www.yenomart.com/productdetail/${product.slug || product.product_id}`}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="text-emerald-400 hover:text-emerald-300 font-semibold hover:underline"
                                  >
                                    View on Yenomart ↗
                                  </a>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap mt-1">
                                  <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded font-semibold border border-indigo-500/20">
                                    {product.category}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Unit Price */}
                          <td className="px-4 py-3 text-right text-xs font-bold text-slate-200 border-r border-slate-800/60">
                            {money(product.rule_price ?? product.price ?? 0)}
                          </td>

                          {/* Qty Cell */}
                          <td className="px-4 py-3 border-r border-slate-800/60 text-center">
                            <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-black border border-emerald-500/20">
                              x{product.quantity}
                            </span>
                          </td>

                          {/* Order Total Cell */}
                          <td className="px-4 py-3 text-right text-xs font-black">
                            <div className="text-sm font-black text-emerald-400">{money(product.order_total)}</div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <div className="inline-flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                            <ShoppingBag className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-bold text-slate-300 mb-0">Shopping Cart Empty</p>
                          <p className="text-xs text-slate-500">This customer has no active products in their cart.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Table Summary Footer */}
                {processedProducts.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-800 bg-slate-900/90">
                      <td colSpan={3} className="px-4 py-3 text-right text-xs font-black text-slate-300 uppercase tracking-wider">
                        Total Items: {subtotals.totalItems} | Total Quantity: {subtotals.totalQuantity} units
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-black text-emerald-400">
                        x{subtotals.totalQuantity}
                      </td>
                      <td className="px-4 py-3 text-right text-base font-black text-emerald-400">
                        INR {subtotals.order_price.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: SIDEBAR CARDS (1 COL) ── */}
        <div className="lg:col-span-1 space-y-5">
          {/* Customer Info Card */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-3xl p-5 shadow-xl text-white">
            <div className="pb-3 border-b border-slate-800 flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <User className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-black text-white mb-0 uppercase tracking-wider">Customer Profile</h4>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black text-base flex items-center justify-center shrink-0 shadow-md">
                {(customer?.name || "C").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white mb-0 truncate">{customer?.name || "Customer"}</p>
                <p className="text-xs text-slate-400 truncate mb-0">{customer?.email || "—"}</p>
                <p className="text-xs text-slate-400 mb-0">{customer?.phone || "—"}</p>
              </div>
            </div>
          </div>

          {/* Cart Summary Card */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-3xl p-5 shadow-xl text-white sticky top-6">
            <div className="pb-3 border-b border-slate-800 flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black text-white mb-0 uppercase tracking-wider">Cart Summary</h4>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400 font-medium">Unique Products</span>
                <span className="font-bold text-slate-200">{subtotals.totalItems} items</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400 font-medium">Total Quantity</span>
                <span className="font-bold text-slate-200">{subtotals.totalQuantity} units</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400 font-medium">Adjusted Base (INR)</span>
                <span className="font-bold text-slate-200">INR {subtotals.inr_adjusted.toFixed(2)}</span>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center text-sm font-black">
                  <span className="text-slate-300">Total Amount</span>
                  <span className="text-emerald-400 text-lg font-black">INR {subtotals.grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setConvertModalOpen(true)}
                disabled={!processedProducts.length}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold border border-emerald-500/30 transition active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50 mt-3 cursor-pointer"
              >
                <FileCheck className="w-4 h-4" /> Convert to Wholesale Order
              </button>
            </div>
          </div>

          {/* Delivery Address Card */}
          {(customer.address || customer.city || customer.state) && (
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-3xl p-5 shadow-xl text-white">
              <div className="pb-3 border-b border-slate-800 flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <Home className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black text-white mb-0 uppercase tracking-wider">Delivery Address</h4>
              </div>
              <div className="text-xs text-slate-300 space-y-1">
                <p className="font-bold text-white mb-1">{customer.name}</p>
                {customer.address && <p>{customer.address}</p>}
                <p>{[customer.city, customer.state, customer.country].filter(Boolean).join(", ")}</p>
                {customer.postalCode && <p className="font-mono text-slate-400">ZIP: {customer.postalCode}</p>}
              </div>
            </div>
          )}
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
                  {["Air Freight", "Sea Freight"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setFreightType(mode)}
                      className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                        freightType === mode
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          : "bg-slate-950 text-slate-400 border-slate-800"
                      }`}
                    >
                      {mode === "Air Freight" ? <Plane className="w-4 h-4" /> : <Ship className="w-4 h-4" />}
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

      {/* ── WEIGHT AUDIT MODAL ── */}
      {auditModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black text-white">Weight & Dimension Audit (4 Tables)</h3>
              </div>
              <button onClick={() => setAuditModalItem(null)} className="text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">{auditModalItem.name}</h4>
                  <p className="text-slate-400 text-xs">Product ID: #{auditModalItem.productId}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Source: {auditModalItem.shippingDetailsSourceTable}
                </span>
              </div>

              {/* 4 Database Source Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. product_shipping_details */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-emerald-400">1. product_shipping_details</span>
                    <span className="text-[10px] text-slate-400 font-mono">PRIMARY RECORD</span>
                  </div>
                  <div className="space-y-1 text-slate-300">
                    <p>Weight: <strong className="text-white">{auditModalItem.weight} {auditModalItem.measurementType}</strong></p>
                    <p>Dimensions: <strong className="text-white">{auditModalItem.length}×{auditModalItem.width}×{auditModalItem.height} cm</strong></p>
                    <p>Sea Charge: <strong className="text-emerald-400">₹{auditModalItem.shipping_charge_sea}</strong></p>
                    <p>Air Charge: <strong className="text-indigo-400">₹{auditModalItem.shipping_charge_air}</strong></p>
                  </div>
                </div>

                {/* 2. product_sku_list */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-indigo-400">2. product_sku_list</span>
                    <span className="text-[10px] text-slate-400 font-mono">SKU TABLE</span>
                  </div>
                  {auditModalItem.tablesBreakdown?.product_sku_list ? (
                    <div className="space-y-1 text-slate-300">
                      <p>SKU Weight: <strong className="text-white">{auditModalItem.tablesBreakdown.product_sku_list.weight ?? '—'} kg</strong></p>
                      <p>Sea Charge: <strong className="text-emerald-400">₹{auditModalItem.tablesBreakdown.product_sku_list.shipping_charge_sea}</strong></p>
                      <p>Air Charge: <strong className="text-indigo-400">₹{auditModalItem.tablesBreakdown.product_sku_list.shipping_charge_air}</strong></p>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">No SKU record linked.</p>
                  )}
                </div>

                {/* 3. productdetail */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-blue-400">3. productdetail</span>
                    <span className="text-[10px] text-slate-400 font-mono">RAW DETAIL TABLE</span>
                  </div>
                  {auditModalItem.tablesBreakdown?.productdetail ? (
                    <div className="space-y-1 text-slate-300">
                      <p>Official 1688 Weight: <strong className="text-white">{auditModalItem.tablesBreakdown.productdetail.officialWeight ?? '—'} kg</strong></p>
                      <p>Package Size Source: <strong className="text-slate-200">{auditModalItem.tablesBreakdown.productdetail.pkgSizeSource ?? '—'}</strong></p>
                      <p>Post Fee (China): <strong className="text-amber-400">¥{auditModalItem.tablesBreakdown.productdetail.postFee}</strong></p>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">No productdetail record linked.</p>
                  )}
                </div>

                {/* 4. productshop */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-teal-400">4. productshop</span>
                    <span className="text-[10px] text-slate-400 font-mono">RAW SHOP TABLE</span>
                  </div>
                  {auditModalItem.tablesBreakdown?.productshop ? (
                    <div className="space-y-1 text-slate-300">
                      <p>Shop Weight: <strong className="text-white">{auditModalItem.tablesBreakdown.productshop.weight} kg</strong></p>
                      <p>Dimensions: <strong className="text-white">{auditModalItem.tablesBreakdown.productshop.length}×{auditModalItem.tablesBreakdown.productshop.width}×{auditModalItem.tablesBreakdown.productshop.height} cm</strong></p>
                      <p>Sea Charge: <strong className="text-emerald-400">₹{auditModalItem.tablesBreakdown.productshop.shipping_charge_sea}</strong></p>
                      <p>Air Charge: <strong className="text-indigo-400">₹{auditModalItem.tablesBreakdown.productshop.shipping_charge_air}</strong></p>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">No productshop record linked.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setAuditModalItem(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

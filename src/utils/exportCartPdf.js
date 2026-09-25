import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatVariantEnglish, sanitizeForPdf } from "@/utils/variantTranslation";

/**
 * Resolves full product image URL using https://img.yenomart.com/ for relative/S3 paths
 */
const getFullImageUrl = (url) => {
  if (!url || typeof url !== "string") return null;
  let cleanUrl = url.trim();
  if (!cleanUrl) return null;
  if (cleanUrl.startsWith("//")) {
    return "https:" + cleanUrl;
  }
  if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://") || cleanUrl.startsWith("data:image/")) {
    return cleanUrl;
  }
  if (cleanUrl.startsWith("/")) {
    return cleanUrl;
  }
  const relativePath = cleanUrl.replace(/^\/+/, "");
  return `https://img.yenomart.com/${relativePath}`;
};

/**
 * Robust Image Loader that uses the internal /api/image-proxy endpoint
 * to guarantee 100% CORS-free image loading and base64 conversion in jsPDF.
 */
const loadProductImageWithRetry = async (url, retries = 2) => {
  if (!url || typeof url !== "string") return null;
  const cleanUrl = getFullImageUrl(url);
  if (!cleanUrl) return null;

  // 1. Same-origin local asset (e.g. /images/logo/logo.png, /logo.png)
  if (cleanUrl.startsWith("/") && !cleanUrl.startsWith("//")) {
    try {
      const res = await fetch(cleanUrl);
      if (res.ok) {
        const blob = await res.blob();
        if (blob && blob.size > 0) {
          const dataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
          if (dataUrl && typeof dataUrl === "string") {
            return dataUrl;
          }
        }
      }
    } catch (e) {
      // Continue to canvas fallback
    }
  }

  // 2. Remote asset via internal Image Proxy (Server-side fetch has NO CORS limits)
  if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
    try {
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(cleanUrl)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const blob = await res.blob();
        if (blob && blob.size > 0) {
          const dataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
          if (dataUrl && typeof dataUrl === "string") {
            return dataUrl;
          }
        }
      }
    } catch (err) {
      // Fall through to Canvas fallback
    }
  }

  // 3. Canvas fallback (uses <img> which adheres to img-src CSP)
  for (let attempt = 0; attempt <= retries; attempt++) {
    const imgData = await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const targetSize = 200;
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, targetSize, targetSize);

          const scale = Math.min(targetSize / img.naturalWidth, targetSize / img.naturalHeight);
          const drawW = img.naturalWidth * scale;
          const drawH = img.naturalHeight * scale;
          const offsetX = (targetSize - drawW) / 2;
          const offsetY = (targetSize - drawH) / 2;

          ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
          resolve(canvas.toDataURL("image/jpeg", 0.90));
        } catch (err) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = cleanUrl;
    });

    if (imgData) return imgData;
  }

  return null;
};

// Helper formatters
const formatNumber = (amount, decimals = 2) => {
  const numeric = Number(amount || 0);
  return numeric.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const formatCurrencyINR = (amount) => `INR ${formatNumber(amount, 2)}`;

const formatDateString = (dateInput) => {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatVariantString = (val) => formatVariantEnglish(val);

const sanitizeFileName = (name) => {
  if (!name) return "Customer";
  return name.trim().replace(/[^a-zA-Z0-9_\-]/g, "_");
};

/**
 * Builds the direct Yenomart frontend product detail URL
 */
const getProductFrontendUrl = (item) => {
  if (!item) return "https://www.yenomart.com";
  const slugOrId = item.slug || item.productId || item.product_id || item.id || "";
  if (!slugOrId) return "https://www.yenomart.com";
  return `https://www.yenomart.com/productdetail/${slugOrId}`;
};

/**
 * Main Professional Customer Cart Items PDF Generator (Pure Cart Items List with Product Links & Quotation Delivery Option)
 */
export async function exportCustomerCartPdf({
  customer = {},
  cartItems = [],
  subtotals = null,
  deliveryCharge = 0,
  freightType = "",
  shippingNote = ""
}) {
  const jsPDFConstructor = jsPDF?.jsPDF || (typeof jsPDF === "function" ? jsPDF : jsPDF?.default);
  const runAutoTable = (targetDoc, options) => {
    if (typeof autoTable === "function") {
      autoTable(targetDoc, options);
      return;
    }
    if (typeof autoTable?.default === "function") {
      autoTable.default(targetDoc, options);
      return;
    }
    if (typeof autoTable?.autoTable === "function") {
      autoTable.autoTable(targetDoc, options);
      return;
    }
    if (typeof targetDoc.autoTable === "function") {
      targetDoc.autoTable(options);
      return;
    }
    throw new Error("autoTable is not available on jsPDF");
  };

  const doc = new jsPDFConstructor({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12; // 12mm margins

  // Parse delivery charge & calculate totals
  const numDeliveryCharge = Math.max(0, Number(deliveryCharge) || 0);
  const cleanFreightType = freightType ? sanitizeForPdf(String(freightType).trim()) : "";
  const cleanShippingNote = shippingNote ? sanitizeForPdf(String(shippingNote).trim()) : "";

  // Yenomart Brand Palette
  const colorPrimary = [15, 23, 42];     // Deep Navy #0F172A
  const colorAccent = [79, 70, 229];     // Royal Indigo #4F46E5
  const colorAccentBg = [238, 242, 255]; // Soft Indigo #EEF2FF
  const colorLightBg = [248, 250, 252];  // Slate Light #F8FAFC
  const colorBorder = [226, 232, 240];   // Slate Border #E2E8F0
  const colorTextDark = [30, 41, 59];    // Slate Dark #1E293B
  const colorTextMuted = [100, 116, 139]; // Slate Muted #64748B
  const colorGreen = [22, 101, 52];       // Emerald Green

  // Preload Images
  const logoUrl = "/images/logo/logo.png";
  const logoPromise = loadProductImageWithRetry(logoUrl, 1);

  const productImagesPromises = cartItems.map((item) => {
    const imgUrl =
      item.image ||
      item.thumbnail_img ||
      item.sku?.s3Url ||
      item.sku?.picUrl ||
      item.product?.main_image_s3 ||
      item.product?.main_image_url ||
      "";
    return loadProductImageWithRetry(imgUrl, 2);
  });

  const [logoImg, ...loadedProductImages] = await Promise.all([
    logoPromise,
    ...productImagesPromises,
  ]);

  // Watermark
  const drawPageWatermark = () => {
    try {
      if (typeof doc.saveGraphicsState === "function") {
        doc.saveGraphicsState();
      }
      if (typeof doc.setGState === "function" && typeof doc.GState === "function") {
        doc.setGState(new doc.GState({ opacity: 0.03 }));
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(34);
      doc.setTextColor(...colorAccent);
      doc.text("YENOMART CART QUOTATION", pageWidth / 2, pageHeight / 2, {
        align: "center",
        angle: 35,
      });
      if (typeof doc.restoreGraphicsState === "function") {
        doc.restoreGraphicsState();
      }
    } catch (e) {
      // Ignore watermark error if GState not supported
    }
  };

  drawPageWatermark();

  // Top Accent Bar
  doc.setFillColor(...colorAccent);
  doc.rect(0, 0, pageWidth, 3.5, "F");

  let currentY = 11;

  // ── HEADER: COMPANY BRANDING (LEFT) & METADATA (RIGHT) ──
  if (logoImg) {
    try {
      doc.addImage(logoImg, "PNG", margin, currentY, 34, 10);
    } catch (e) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...colorAccent);
      doc.text("YENOMART", margin, currentY + 7);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...colorAccent);
    doc.text("YENOMART", margin, currentY + 7);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...colorTextDark);
  doc.text("YENOMART WHOLESALE B2B", margin, currentY + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...colorTextMuted);
  doc.text("Email: support@yenomart.com  |  Web: www.yenomart.com", margin, currentY + 18);

  // Top Right: Document Title & Reference No
  const exportDateStr = formatDateString(new Date());
  const cartRefNo = `QT-${new Date().getFullYear()}-${String(customer.id || "001").padStart(5, "0")}`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...colorPrimary);
  doc.text("CART QUOTATION", pageWidth - margin, currentY + 5, { align: "right" });

  doc.setFontSize(8.5);
  doc.setTextColor(...colorAccent);
  doc.text(`Quotation Ref #: ${cartRefNo}`, pageWidth - margin, currentY + 10, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...colorTextMuted);
  doc.text(`Date: ${exportDateStr}`, pageWidth - margin, currentY + 14.5, { align: "right" });

  // Status Badge / Freight Tag
  const badgeText = cleanFreightType ? `${cleanFreightType.toUpperCase()}` : "LIVE WHOLESALE QUOTATION";
  const badgeWidth = Math.max(38, Math.min(65, badgeText.length * 2.5 + 8));
  doc.setFillColor(220, 252, 231); // Soft Green
  doc.roundedRect(pageWidth - margin - badgeWidth, currentY + 17.5, badgeWidth, 5, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...colorGreen);
  doc.text(badgeText, pageWidth - margin - (badgeWidth / 2), currentY + 21, { align: "center" });

  currentY += 26;

  // Divider Line
  doc.setDrawColor(...colorBorder);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 5;

  // ── SECTION 1: CUSTOMER PROFILE & CART SUMMARY (2 SIDE-BY-SIDE CARDS) ──
  const cardW = 91;
  const cardH = numDeliveryCharge > 0 ? 33 : 30;
  const leftX = margin;
  const rightX = margin + cardW + 4;

  // Left Box: Customer Details
  doc.setFillColor(...colorAccentBg);
  doc.roundedRect(leftX, currentY, cardW, cardH, 2, 2, "F");
  doc.setDrawColor(...colorBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(leftX, currentY, cardW, cardH, 2, 2, "S");

  let cY = currentY + 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...colorAccent);
  doc.text("CUSTOMER PROFILE", leftX + 4, cY);

  cY += 4.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...colorTextDark);
  const custName = customer.name || "Customer";
  doc.text(custName.length > 34 ? `${custName.substring(0, 32)}...` : custName, leftX + 4, cY);

  cY += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...colorTextMuted);
  doc.text(`Customer ID: #${customer.id || "N/A"}${customer.businessName ? `  |  Company: ${customer.businessName}` : ""}`, leftX + 4, cY);

  cY += 3.8;
  doc.text(`Phone: ${customer.phone || "—"}  |  Email: ${customer.email || "—"}`, leftX + 4, cY);

  cY += 3.8;
  const fullAddress = [customer.address, customer.city, customer.state, customer.country].filter(Boolean).join(", ") || "India Address";
  doc.text(`Location: ${fullAddress.length > 44 ? `${fullAddress.substring(0, 42)}...` : fullAddress}`, leftX + 4, cY);

  // Right Box: Cart Summary Details
  doc.setFillColor(...colorAccentBg);
  doc.roundedRect(rightX, currentY, cardW, cardH, 2, 2, "F");
  doc.setDrawColor(...colorBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(rightX, currentY, cardW, cardH, 2, 2, "S");

  let sY = currentY + 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...colorAccent);
  doc.text("QUOTATION SUMMARY", rightX + 4, sY);

  sY += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...colorTextMuted);

  const totalItemCount = cartItems.length;
  const totalUnitsCount = cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  const productSubtotalINR = subtotals?.grandTotal ?? subtotals?.subtotalOrderPrice ?? subtotals?.order_price ?? cartItems.reduce((sum, item) => sum + Number(item.order_total || item.total || ((item.rule_price ?? item.price ?? 0) * (item.quantity || 1))), 0);
  const finalGrandTotalINR = productSubtotalINR + numDeliveryCharge;

  doc.text(`Items: ${totalItemCount} SKUs (${totalUnitsCount} Units)`, rightX + 4, sY);
  doc.text(`Currency: INR`, rightX + cardW - 4, sY, { align: "right" });

  if (numDeliveryCharge > 0) {
    sY += 3.8;
    const freightLabel = cleanFreightType ? `${cleanFreightType}` : "Delivery Charge";
    doc.text(`Product Subtotal: ${formatCurrencyINR(productSubtotalINR)}`, rightX + 4, sY);

    sY += 3.8;
    doc.text(`${freightLabel}: + ${formatCurrencyINR(numDeliveryCharge)}`, rightX + 4, sY);

    sY += 4.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...colorAccent);
    doc.text(`Grand Total: ${formatCurrencyINR(finalGrandTotalINR)}`, rightX + 4, sY);
  } else {
    sY += 4.5;
    doc.text(`Products: ${totalItemCount} SKUs (${totalUnitsCount} Units)`, rightX + 4, sY);

    sY += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...colorAccent);
    doc.text(`Total Cart Amount: ${formatCurrencyINR(productSubtotalINR)}`, rightX + 4, sY);
  }

  currentY += cardH + 6;

  // ── SECTION 2: PRODUCTS TABLE (PROPERLY PROPORTIONED COLUMNS) ──
  const tableRows = cartItems.map((item, idx) => {
    const name = item.name || item.product_name || item.product?.en_title || item.product?.title || "Unnamed Product";
    const skuCode = item.sku?.skuId || item.sku || item.productId || item.product_id || `SKU-${idx + 1}`;
    const variant = item.variation_name || formatVariantEnglish(item.variation || item.sku?.properties || item.sku);

    const qty = Number(item.quantity || 1);
    const unitPriceINR = Number(item.rule_price ?? item.price ?? item.base_inr ?? 0);
    const totalPriceINR = Number(item.order_total || item.total || item.subtotal || (unitPriceINR * qty));
    const cleanName = sanitizeForPdf(name);
    const detailLines = [
      cleanName,
      `SKU: #${skuCode}`,
      variant ? `Variant: ${variant}` : null,
    ].filter(Boolean);

    return [
      String(idx + 1),
      "", // Thumbnail rendered in didDrawCell
      detailLines.join("\n"),
      formatNumber(unitPriceINR),
      String(qty),
      formatNumber(totalPriceINR)
    ];
  });

  runAutoTable(doc, {
    startY: currentY,
    head: [["#", "Image", "Product Details & SKU", "Unit Price (INR)", "Qty", "Total (INR)"]],
    body: tableRows,
    theme: "plain",
    tableWidth: 186,
    headStyles: {
      fillColor: colorAccent,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
      valign: "middle",
      cellPadding: 3,
      minCellHeight: 8,
      overflow: "linebreak",
    },
    bodyStyles: {
      fontSize: 7.2,
      textColor: colorTextDark,
      valign: "middle",
      minCellHeight: 24,
      cellPadding: 3,
      lineColor: colorBorder,
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 8, fontStyle: "bold" },
      1: { halign: "center", cellWidth: 24 }, // Image thumbnail column
      2: { halign: "left", cellWidth: 88, fontStyle: "normal" }, // Product details
      3: { halign: "right", cellWidth: 24 }, // Unit Price
      4: { halign: "center", cellWidth: 16, fontStyle: "bold" }, // Quantity
      5: { halign: "right", cellWidth: 26, fontStyle: "bold", textColor: colorAccent } // Total Price
    },
    alternateRowStyles: {
      fillColor: colorLightBg,
    },
    margin: { left: margin, right: margin, bottom: 20 },
    showHead: "everyPage",
    didDrawCell: (data) => {
      // 1. Render Product Image in Column 1
      if (data.section === "body" && data.column.index === 1) {
        const rowIndex = data.row.index;
        const imgObj = loadedProductImages[rowIndex];
        const cell = data.cell;
        const imgSize = 18; // 18mm x 18mm square
        const x = cell.x + (cell.width - imgSize) / 2;
        const y = cell.y + (cell.height - imgSize) / 2;

        if (imgObj && typeof imgObj === "string") {
          try {
            doc.addImage(imgObj, "JPEG", x, y, imgSize, imgSize);
            doc.setDrawColor(...colorBorder);
            doc.setLineWidth(0.2);
            doc.roundedRect(x, y, imgSize, imgSize, 1, 1, "S");
          } catch (e1) {
            try {
              doc.addImage(imgObj, "PNG", x, y, imgSize, imgSize);
              doc.setDrawColor(...colorBorder);
              doc.setLineWidth(0.2);
              doc.roundedRect(x, y, imgSize, imgSize, 1, 1, "S");
            } catch (e2) {
              // Clean empty square
              doc.setFillColor(248, 250, 252);
              doc.roundedRect(x, y, imgSize, imgSize, 1, 1, "F");
              doc.setDrawColor(...colorBorder);
              doc.setLineWidth(0.2);
              doc.roundedRect(x, y, imgSize, imgSize, 1, 1, "S");
            }
          }
        } else {
          // Clean empty frame when image is missing
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(x, y, imgSize, imgSize, 1, 1, "F");
          doc.setDrawColor(...colorBorder);
          doc.setLineWidth(0.2);
          doc.roundedRect(x, y, imgSize, imgSize, 1, 1, "S");
        }
      }

      // 2. Add clickable hyperlink annotation on Product Details cell (Column 2)
      if (data.section === "body" && data.column.index === 2) {
        const item = cartItems[data.row.index];
        const productFrontendUrl = getProductFrontendUrl(item);
        if (productFrontendUrl) {
          doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, {
            url: productFrontendUrl
          });
        }
      }
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawPageWatermark();
      }
    },
  });

  // Table Final Subtotal Footer Box
  const rawFinalY = doc.lastAutoTable?.finalY ?? doc.autoTable?.previous?.finalY ?? (currentY + 60);
  let finalY = rawFinalY + 6;

  // Calculate required summary box height
  const hasDelivery = numDeliveryCharge > 0;
  const hasNote = cleanShippingNote.length > 0;
  const summaryBoxH = hasDelivery ? (hasNote ? 36 : 28) : (hasNote ? 28 : 20);
  const sumW = 92;
  const sumX = pageWidth - margin - sumW;

  // Check if we need to add a page to avoid overflowing into the footer
  if (finalY + summaryBoxH > pageHeight - 16) {
    doc.addPage();
    drawPageWatermark();
    finalY = margin + 10;
  }

  // Draw Summary Card
  doc.setFillColor(...colorAccentBg);
  doc.roundedRect(sumX, finalY, sumW, summaryBoxH, 2, 2, "F");
  doc.setDrawColor(...colorBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(sumX, finalY, sumW, summaryBoxH, 2, 2, "S");

  let bY = finalY + 5.5;

  // Line 1: Product Cost Subtotal
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...colorTextMuted);
  doc.text(`Product Cost (${totalUnitsCount} Units):`, sumX + 5, bY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colorTextDark);
  doc.text(formatCurrencyINR(productSubtotalINR), sumX + sumW - 5, bY, { align: "right" });

  // Line 2: Delivery / Freight Charge (if any)
  if (hasDelivery) {
    bY += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...colorTextMuted);
    const freightTitle = cleanFreightType ? `Delivery (${cleanFreightType}):` : "Delivery Charge:";
    doc.text(freightTitle, sumX + 5, bY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colorTextDark);
    doc.text(`+ ${formatCurrencyINR(numDeliveryCharge)}`, sumX + sumW - 5, bY, { align: "right" });
  }

  // Line 3: Shipping Note (if any)
  if (hasNote) {
    bY += 4.5;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.8);
    doc.setTextColor(...colorAccent);
    const noteText = `Note: ${cleanShippingNote}`;
    doc.text(noteText.length > 52 ? `${noteText.substring(0, 50)}...` : noteText, sumX + 5, bY);
  }

  // Line 4: Grand Total
  bY += hasDelivery ? 6 : 5.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...colorAccent);
  doc.text(hasDelivery ? "Final Total Amount:" : "Total Amount:", sumX + 5, bY);
  doc.setFontSize(11);
  doc.text(formatCurrencyINR(finalGrandTotalINR), sumX + sumW - 5, bY, { align: "right" });

  // ── FOOTER ON EVERY PAGE ──
  const totalPages = doc.internal.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    const footerY = pageHeight - 12;

    // Divider Line
    doc.setDrawColor(...colorBorder);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    // Footer Left
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...colorAccent);
    doc.text("YENOMART", margin, footerY + 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...colorTextMuted);
    doc.text("Wholesale B2B Marketplace", margin + 18, footerY + 4);

    // Footer Center
    doc.text(
      "support@yenomart.com  |  www.yenomart.com",
      pageWidth / 2,
      footerY + 4,
      { align: "center" }
    );

    // Footer Right: Page X of Y
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...colorTextDark);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      footerY + 4,
      { align: "right" }
    );
  }

  // Save PDF file
  const dateFileNameStr = new Date().toISOString().split("T")[0];
  const cleanCustomerName = sanitizeFileName(customer.name);
  const freightSuffix = cleanFreightType ? `_${cleanFreightType.replace(/\s+/g, "")}` : "";
  const fileName = `Yenomart_Quotation_${cleanCustomerName}${freightSuffix}_${dateFileNameStr}.pdf`;

  doc.save(fileName);
}


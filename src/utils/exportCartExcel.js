import ExcelJS from "exceljs";
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
 * Robust Image Loader that uses internal /api/image-proxy to guarantee CORS-free
 * high-DPI image fetching and base64 embedding in ExcelJS.
 */
const loadBase64Image = async (url, retries = 2) => {
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
            const isPng = dataUrl.startsWith("data:image/png");
            const base64Only = dataUrl.split(",")[1];
            if (base64Only) {
              return {
                base64: base64Only,
                extension: isPng ? "png" : "jpeg"
              };
            }
          }
        }
      }
    } catch (e) {
      // Continue to canvas fallback
    }
  }

  // 2. Remote asset via internal image proxy (bypasses browser CORS and obeys connect-src)
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
            const isPng = dataUrl.startsWith("data:image/png");
            const base64Only = dataUrl.split(",")[1];
            if (base64Only) {
              return {
                base64: base64Only,
                extension: isPng ? "png" : "jpeg"
              };
            }
          }
        }
      }
    } catch (err) {
      // Fall through to Canvas fallback
    }
  }

  // 3. Canvas Image fallback (uses <img> which adheres to img-src CSP)
  for (let attempt = 0; attempt <= retries; attempt++) {
    const imgData = await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const targetSize = 240; // High-DPI canvas for ultra-sharp Excel embedding
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
          resolve(canvas.toDataURL("image/jpeg", 0.92));
        } catch (err) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = cleanUrl;
    });

    if (imgData && typeof imgData === "string") {
      const base64Only = imgData.split(",")[1];
      if (base64Only) {
        return {
          base64: base64Only,
          extension: "jpeg"
        };
      }
    }
  }

  return null;
};

/**
 * Generates and downloads an Executive PDF-style Yenomart Quotation Excel file (.xlsx)
 *
 * @param {Object} params
 * @param {Object} params.customer - Customer details
 * @param {Array} params.cartItems - Array of cart products
 * @param {Object} params.subtotals - Cart financial totals
 */
export async function exportCustomerCartExcel({
  customer = {},
  cartItems = [],
  subtotals = null
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Yenomart";
  wb.lastModifiedBy = "Yenomart Quotation System";
  wb.created = new Date();
  wb.modified = new Date();

  // Premium Palette
  const C = {
    brandNavy: "0F172A",    // Deep Executive Navy #0F172A
    brandIndigo: "4F46E5",  // Royal Indigo #4F46E5
    brandBlue: "2563EB",    // Royal Blue #2563EB
    textDark: "1E293B",     // Slate Dark #1E293B
    textMuted: "64748B",    // Slate Muted #64748B
    cardBg: "F8FAFC",       // Soft Slate #F8FAFC
    cardBorder: "CBD5E1",   // Slate 300 #CBD5E1
    rowBorder: "E2E8F0",    // Soft Border #E2E8F0
    zebraBg: "F8FAFC",      // Alternate Row Tint #F8FAFC
    totalBg: "EEF2FF",      // Total Block Tint #EEF2FF
    totalBorder: "6366F1",  // Total Border Indigo #6366F1
  };

  const ws = wb.addWorksheet("Yenomart Quotation", {
    views: [{ showGridLines: false }], // Clean white document look (no distracting raw gridlines)
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: "6:6", // Repeat table header on every printed page
      margins: {
        left: 0.45,
        right: 0.45,
        top: 0.5,
        bottom: 0.5,
        header: 0.3,
        footer: 0.3
      }
    }
  });

  // Explicit column widths tailored for PDF-like landscape and portrait clarity
  // Columns: 1. No., 2. Product Image, 3. Product Name, 4. Quantity, 5. Total Price
  ws.columns = [
    { key: "no", width: 7 },
    { key: "image", width: 22 },
    { key: "name", width: 48 },
    { key: "quantity", width: 14 },
    { key: "totalPrice", width: 22 }
  ];

  const thinBorder = {
    top: { style: "thin", color: { argb: "FF" + C.rowBorder } },
    bottom: { style: "thin", color: { argb: "FF" + C.rowBorder } },
    left: { style: "thin", color: { argb: "FF" + C.rowBorder } },
    right: { style: "thin", color: { argb: "FF" + C.rowBorder } }
  };

  // ── ROW 1: TOP EXECUTIVE BANNER ──
  ws.mergeCells("A1:C1");
  const brandTitleCell = ws.getCell("A1");
  brandTitleCell.value = "YENOMART";
  brandTitleCell.font = { name: "Arial", size: 18, bold: true, color: { argb: "FF" + C.brandNavy } };
  brandTitleCell.alignment = { vertical: "middle", horizontal: "left" };

  ws.mergeCells("D1:E1");
  const quoHeadingCell = ws.getCell("D1");
  quoHeadingCell.value = "QUOTATION";
  quoHeadingCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FF" + C.brandIndigo } };
  quoHeadingCell.alignment = { vertical: "middle", horizontal: "right" };
  ws.getRow(1).height = 26;

  // ── ROW 2: SUBTITLE / METADATA ──
  const quotationNo = `YNM-QUO-${new Date().getFullYear()}-${String(customer.id || Math.floor(1000 + Math.random() * 9000)).padStart(5, "0")}`;
  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  ws.mergeCells("A2:C2");
  const brandSubCell = ws.getCell("A2");
  brandSubCell.value = "Wholesale B2B Quotation  |  www.yenomart.com";
  brandSubCell.font = { name: "Arial", size: 9, color: { argb: "FF" + C.textMuted } };
  brandSubCell.alignment = { vertical: "middle", horizontal: "left" };

  ws.mergeCells("D2:E2");
  const quoMetaCell = ws.getCell("D2");
  quoMetaCell.value = `Quotation #: ${quotationNo}   |   Date: ${dateStr}`;
  quoMetaCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF" + C.textDark } };
  quoMetaCell.alignment = { vertical: "middle", horizontal: "right" };
  ws.getRow(2).height = 18;

  // ── ROW 3 & 4: CUSTOMER & ISSUER CARDS ──
  // Customer Box (Left: A3:C4)
  ws.mergeCells("A3:C3");
  const custHead = ws.getCell("A3");
  custHead.value = "QUOTATION FOR (CUSTOMER):";
  custHead.font = { name: "Arial", size: 8, bold: true, color: { argb: "FF" + C.brandIndigo } };
  custHead.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + C.cardBg } };
  custHead.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

  ws.mergeCells("A4:C4");
  const custBody = ws.getCell("A4");
  const cName = customer.name || "Valued Customer";
  const cPhone = customer.phone && customer.phone !== "—" ? ` | Phone: ${customer.phone}` : "";
  const cEmail = customer.email && customer.email !== "—" ? ` | Email: ${customer.email}` : "";
  const cAddress = [customer.address, customer.city, customer.state].filter(Boolean).join(", ");
  custBody.value = `${cName} (ID: #${customer.id || "N/A"})${cPhone}${cEmail}${cAddress ? `\nAddress: ${cAddress}` : ""}`;
  custBody.font = { name: "Arial", size: 9, bold: false, color: { argb: "FF" + C.textDark } };
  custBody.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + C.cardBg } };
  custBody.alignment = { vertical: "middle", horizontal: "left", wrapText: true, indent: 1 };

  // Issuer Box (Right: D3:E4)
  ws.mergeCells("D3:E3");
  const issuerHead = ws.getCell("D3");
  issuerHead.value = "ISSUED BY (SUPPLIER):";
  issuerHead.font = { name: "Arial", size: 8, bold: true, color: { argb: "FF" + C.brandIndigo } };
  issuerHead.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + C.cardBg } };
  issuerHead.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

  ws.mergeCells("D4:E4");
  const issuerBody = ws.getCell("D4");
  issuerBody.value = "Yenomart Global Wholesale\nEmail: support@yenomart.com | Web: www.yenomart.com";
  issuerBody.font = { name: "Arial", size: 9, bold: false, color: { argb: "FF" + C.textDark } };
  issuerBody.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + C.cardBg } };
  issuerBody.alignment = { vertical: "middle", horizontal: "left", wrapText: true, indent: 1 };

  ws.getRow(3).height = 18;
  ws.getRow(4).height = 32;

  // Add borders to customer and issuer cards
  ["A3", "B3", "C3", "A4", "B4", "C4", "D3", "E3", "D4", "E4"].forEach((addr) => {
    ws.getCell(addr).border = {
      top: { style: "thin", color: { argb: "FF" + C.cardBorder } },
      bottom: { style: "thin", color: { argb: "FF" + C.cardBorder } },
      left: { style: "thin", color: { argb: "FF" + C.cardBorder } },
      right: { style: "thin", color: { argb: "FF" + C.cardBorder } }
    };
  });

  // Row 5: Clean breathing spacer
  ws.getRow(5).height = 10;

  // ── ROW 6: TABLE COLUMN HEADERS ──
  // Columns: 1. No., 2. Product Image, 3. Product Name, 4. Quantity, 5. Total Price
  const headerRowIdx = 6;
  const headerRow = ws.getRow(headerRowIdx);
  headerRow.values = [
    "No.",
    "Product Image",
    "Product Name",
    "Quantity",
    "Total Price"
  ];
  headerRow.height = 28;

  headerRow.eachCell((cell, colNumber) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + C.brandNavy } };
    cell.border = {
      top: { style: "medium", color: { argb: "FF" + C.brandNavy } },
      bottom: { style: "medium", color: { argb: "FF" + C.brandNavy } },
      left: { style: "thin", color: { argb: "FF334155" } },
      right: { style: "thin", color: { argb: "FF334155" } }
    };
    if (colNumber === 1 || colNumber === 2 || colNumber === 4) {
      cell.alignment = { vertical: "middle", horizontal: "center" };
    } else if (colNumber === 3) {
      cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    } else if (colNumber === 5) {
      cell.alignment = { vertical: "middle", horizontal: "right" };
    }
  });

  // ── PRELOAD ALL PRODUCT IMAGES IN PARALLEL ──
  const imageFetchPromises = cartItems.map((item) => {
    const imgUrl =
      item.image ||
      item.thumbnail_img ||
      item.sku?.s3Url ||
      item.sku?.picUrl ||
      item.product?.main_image_s3 ||
      item.product?.main_image_url ||
      "";
    return loadBase64Image(imgUrl, 2);
  });

  // Also preload brand logo if available
  const logoPromise = loadBase64Image("/images/logo/logo.png", 1);

  const [brandLogoObj, ...loadedImages] = await Promise.all([
    logoPromise,
    ...imageFetchPromises
  ]);

  // If brand logo loaded, embed it in header
  if (brandLogoObj && brandLogoObj.base64) {
    try {
      const logoId = wb.addImage({
        base64: brandLogoObj.base64,
        extension: brandLogoObj.extension || "png"
      });
      ws.addImage(logoId, {
        tl: { col: 0.1, row: 0.1 },
        ext: { width: 130, height: 38 },
        editAs: "oneCell"
      });
      brandTitleCell.value = ""; // Clear text since logo image is displayed
    } catch (e) {
      // Keep text fallback
    }
  }

  // ── POPULATE PRODUCT ROWS ──
  let currentRowIdx = 7;
  // 90pt row height = ~120px height for clear, visible product photos
  const itemRowHeight = 90;
  let calculatedGrandTotal = 0;

  cartItems.forEach((item, index) => {
    const row = ws.getRow(currentRowIdx);
    row.height = itemRowHeight;

    const no = index + 1;
    const rawName = item.name || item.product_name || item.product?.en_title || item.product?.title || "Product";
    const name = sanitizeForPdf(rawName);
    const sku = item.sku?.skuId || item.sku || item.productId || item.product_id;
    const variant = item.variation_name || formatVariantEnglish(item.variation || item.sku?.properties || item.sku);
    const skuInfo = [sku ? `SKU: #${sku}` : "", variant ? `Variant: ${variant}` : ""].filter(Boolean).join("  |  ");
    const fullDisplayName = skuInfo ? `${name}\n${skuInfo}` : name;

    const productFrontendUrl = item.slug
      ? `https://www.yenomart.com/productdetail/${item.slug}`
      : (item.productId || item.product_id ? `https://www.yenomart.com/productdetail/${item.productId || item.product_id}` : null);

    const qty = Number(item.quantity || 1);
    const unitPrice = Number(item.rule_price ?? item.price ?? item.base_inr ?? 0);
    const totalPrice = Number(item.order_total || item.total || item.subtotal || (unitPrice * qty));

    calculatedGrandTotal += totalPrice;

    // Col 1: No.
    const cellNo = row.getCell(1);
    cellNo.value = no;
    cellNo.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF" + C.textDark } };
    cellNo.alignment = { vertical: "middle", horizontal: "center" };
    cellNo.border = thinBorder;

    // Col 2: Product Image (Empty cell placeholder with border; image placed via ws.addImage)
    const cellImg = row.getCell(2);
    cellImg.value = "";
    cellImg.border = thinBorder;
    cellImg.alignment = { vertical: "middle", horizontal: "center" };

    const imgObj = loadedImages[index];
    if (imgObj && imgObj.base64) {
      try {
        const imageId = wb.addImage({
          base64: imgObj.base64,
          extension: imgObj.extension || "jpeg"
        });

        // Center large ~95px x 95px image inside Column 2 (col index 1)
        ws.addImage(imageId, {
          tl: { col: 1 + 0.18, row: currentRowIdx - 1 + 0.08 },
          ext: { width: 95, height: 95 },
          editAs: "oneCell"
        });
      } catch (err) {
        // Leave clean blank cell on failure
        cellImg.value = "";
      }
    } else {
      // Leave clean blank cell when no image
      cellImg.value = "";
    }

    // Col 3: Product Name with direct Clickable Hyperlink
    const cellName = row.getCell(3);
    if (productFrontendUrl) {
      cellName.value = {
        text: fullDisplayName,
        hyperlink: productFrontendUrl,
        tooltip: `Open on Yenomart: ${productFrontendUrl}`
      };
    } else {
      cellName.value = fullDisplayName;
    }
    cellName.font = { name: "Arial", size: 9.5, color: { argb: "FF" + C.textDark } };
    cellName.alignment = { vertical: "middle", horizontal: "left", wrapText: true, indent: 1 };
    cellName.border = thinBorder;

    // Col 4: Quantity
    const cellQty = row.getCell(4);
    cellQty.value = qty;
    cellQty.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF" + C.brandIndigo } };
    cellQty.alignment = { vertical: "middle", horizontal: "center" };
    cellQty.border = thinBorder;

    // Col 5: Total Price
    const cellPrice = row.getCell(5);
    cellPrice.value = totalPrice;
    cellPrice.numFmt = '"₹"#,##0.00;("₹"#,##0.00);"-"';
    cellPrice.font = { name: "Arial", size: 10.5, bold: true, color: { argb: "FF" + C.textDark } };
    cellPrice.alignment = { vertical: "middle", horizontal: "right" };
    cellPrice.border = thinBorder;

    // Alternate row zebra styling
    if (index % 2 === 1) {
      const altFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + C.zebraBg } };
      cellNo.fill = altFill;
      cellImg.fill = altFill;
      cellName.fill = altFill;
      cellQty.fill = altFill;
      cellPrice.fill = altFill;
    }

    currentRowIdx++;
  });

  // ── ROW: TABLE BOTTOM BORDER SPACER ──
  ws.getRow(currentRowIdx).height = 6;
  currentRowIdx++;

  // ── ROW: LARGE EXECUTIVE FINAL TOTAL BOX ──
  const numDeliveryCharge = Number(deliveryCharge) || 0;
  const productSubtotal = subtotals?.subtotalOrderPrice ?? subtotals?.order_price ?? calculatedGrandTotal;
  const finalTotalAmount = productSubtotal + numDeliveryCharge;

  const totalRow = ws.getRow(currentRowIdx);
  totalRow.height = 36;

  // Merge A to D for "TOTAL PRICE:" label
  ws.mergeCells(`A${currentRowIdx}:D${currentRowIdx}`);
  const totalLabelCell = ws.getCell(`A${currentRowIdx}`);
  totalLabelCell.value = "TOTAL PRICE:";
  totalLabelCell.font = { name: "Arial", size: 13, bold: true, color: { argb: "FF" + C.brandNavy } };
  totalLabelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + C.totalBg } };
  totalLabelCell.alignment = { vertical: "middle", horizontal: "right", indent: 1 };

  // Total Value Cell in Column 5
  const totalValueCell = totalRow.getCell(5);
  totalValueCell.value = finalTotalAmount;
  totalValueCell.numFmt = '"₹"#,##0.00;("₹"#,##0.00);"-"';
  totalValueCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF" + C.brandIndigo } };
  totalValueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + C.totalBg } };
  totalValueCell.alignment = { vertical: "middle", horizontal: "right" };

  const totalBorderStyle = {
    top: { style: "medium", color: { argb: "FF" + C.totalBorder } },
    bottom: { style: "double", color: { argb: "FF" + C.totalBorder } },
    left: { style: "thin", color: { argb: "FFCBD5E1" } },
    right: { style: "thin", color: { argb: "FFCBD5E1" } }
  };

  for (let c = 1; c <= 5; c++) {
    totalRow.getCell(c).border = totalBorderStyle;
  }

  currentRowIdx += 2;

  // ── ROW: TERMS & CONDITIONS FOOTER BOX ──
  ws.mergeCells(`A${currentRowIdx}:E${currentRowIdx}`);
  const notesHead = ws.getCell(`A${currentRowIdx}`);
  notesHead.value = "TERMS & CONDITIONS";
  notesHead.font = { name: "Arial", size: 8.5, bold: true, color: { argb: "FF" + C.brandIndigo } };
  notesHead.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(currentRowIdx).height = 16;
  currentRowIdx++;

  ws.mergeCells(`A${currentRowIdx}:E${currentRowIdx}`);
  const notesBody = ws.getCell(`A${currentRowIdx}`);
  notesBody.value = "1. Quotation prices are calculated based on live wholesale pricing tiers and exchange rates.\n2. Goods are subject to stock availability upon final order confirmation.\n3. Thank you for choosing Yenomart! For inquiries, reach us at support@yenomart.com or visit www.yenomart.com.";
  notesBody.font = { name: "Arial", size: 8, color: { argb: "FF" + C.textMuted } };
  notesBody.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  ws.getRow(currentRowIdx).height = 36;

  // ── WRITE TO BUFFER & TRIGGER BROWSER DOWNLOAD ──
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  const dateFileName = new Date().toISOString().slice(0, 10);
  const downloadFileName = `Yenomart_Quotation_${dateFileName}.xlsx`;

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = downloadFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

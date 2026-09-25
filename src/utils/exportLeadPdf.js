import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportLeadPdf = async (lead) => {
  if (!lead) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = [16, 185, 129];
  const darkColor = [15, 23, 42];
  const lightBg = [248, 250, 252];

  doc.setFillColor(...darkColor);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('YENOMART SALES LEAD SUMMARY', 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Lead ID: #${lead.id} | Generated on ${new Date().toLocaleDateString()}`, 14, 25);

  let currentY = 40;

  doc.setFillColor(...lightBg);
  doc.roundedRect(14, currentY, 182, 38, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, 182, 38, 3, 3, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...darkColor);
  doc.text('CUSTOMER INFORMATION', 18, currentY + 7);
  doc.text('LEAD PARAMETERS', 110, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  doc.text(`Customer Name: ${lead.customer_name || 'N/A'}`, 18, currentY + 14);
  doc.text(`Phone: ${lead.phone || 'N/A'}`, 18, currentY + 20);
  doc.text(`Email: ${lead.email || 'N/A'}`, 18, currentY + 26);
  doc.text(`Registered Customer ID: ${lead.user_id ? `#${lead.user_id}` : 'Guest / New'}`, 18, currentY + 32);

  doc.text(`Lead Type: ${lead.lead_type || 'Single'}`, 110, currentY + 14);
  doc.text(`Priority: ${lead.priority || 'Prospect'}`, 110, currentY + 20);
  doc.text(`Shipping Type: ${lead.shipping_type || 'Air'} Freight`, 110, currentY + 26);
  doc.text(`Entered By: ${lead.creator?.name || lead.creator?.email || (lead.created_by_id ? `User #${lead.created_by_id}` : 'System / Admin')}`, 110, currentY + 32);

  currentY += 45;

  const tableData = (lead.items || []).map((item, index) => {
    const qty = item.quantity || 1;
    const price = item.unit_price || 0;
    const total = item.total_price || (qty * price);
    const specStr = item.size ? `Size/Variant: ${item.size}` : '';

    return [
      index + 1,
      `${item.product_name || 'Product'}\n${specStr}`,
      `₹${price.toFixed(2)}`,
      qty,
      `₹${total.toFixed(2)}`,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Product & Specification', 'Unit Price', 'Qty', 'Total Price']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: darkColor,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 95 },
      2: { cellWidth: 25, halign: 'right' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 35, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = doc.lastAutoTable.finalY + 10;

  doc.setFillColor(...darkColor);
  doc.roundedRect(120, finalY, 76, 25, 2, 2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(`Total Units Requested: ${lead.quantity || 1}`, 125, finalY + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(52, 211, 153);
  doc.text(`Total Amount: ₹${(lead.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 125, finalY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Yenomart B2B Sales Portal - Confidential Sales Lead Record', 14, 285);

  doc.save(`Sales_Lead_${lead.id}_${lead.customer_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Customer'}.pdf`);
};

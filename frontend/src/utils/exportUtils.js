import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Export data array or matrix to Excel (.xlsx) file
 */
export function exportToExcel({ filename, sheetName = 'Sheet1', data, headers, companyInfo = true }) {
  const wb = XLSX.utils.book_new();

  let sheetData = [];

  if (companyInfo) {
    sheetData.push(['YOUSAFZAI AGRI FOODS (PVT) LTD']);
    sheetData.push(['AgenTech Enterprise Resource Planning System']);
    sheetData.push([filename.replace(/_/g, ' ').toUpperCase()]);
    sheetData.push([`Generated On: ${new Date().toLocaleString()}`]);
    sheetData.push([]); // blank separator
  }

  if (headers && headers.length > 0) {
    sheetData.push(headers);
  }

  if (Array.isArray(data[0])) {
    sheetData = sheetData.concat(data);
  } else {
    // Array of objects
    data.forEach(item => {
      sheetData.push(Object.values(item));
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths
  const colWidths = (headers || Object.keys(data[0] || {})).map(() => ({ wch: 22 }));
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Export report to formatted corporate PDF
 */
export function exportToPDF({
  filename,
  title,
  subtitle,
  period,
  kpis = [],
  headers,
  rows,
  summaryNotes = []
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Corporate Header Banner (Dark Forest Green #0E2118)
  doc.setFillColor(14, 33, 24);
  doc.rect(0, 0, pageWidth, 75, 'F');

  // Accent Gold Bar
  doc.setFillColor(245, 158, 11);
  doc.rect(0, 75, pageWidth, 4, 'F');

  // Brand Name & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('YOUSAFZAI AGRI FOODS (PVT) LTD', 40, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(167, 243, 208); // Light emerald
  doc.text('AgenTech ERP · Head Office Mardan · Rashakai Processing Plant', 40, 48);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth - 40, 48, { align: 'right' });

  // 2. Report Title & Period
  let currentY = 105;
  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(title.toUpperCase(), 40, currentY);

  if (subtitle || period) {
    currentY += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    const subText = period ? `${subtitle ? subtitle + ' · ' : ''}Reporting Period: ${period}` : subtitle;
    doc.text(subText, 40, currentY);
  }

  // 3. KPI Highlights Cards (if provided)
  if (kpis && kpis.length > 0) {
    currentY += 20;
    const cardGap = 10;
    const margin = 40;
    const availableWidth = pageWidth - (margin * 2);
    const cardWidth = (availableWidth - (cardGap * (kpis.length - 1))) / kpis.length;
    const cardHeight = 44;

    kpis.forEach((kpi, idx) => {
      const cardX = margin + (idx * (cardWidth + cardGap));

      // Card Background & Border
      doc.setFillColor(249, 250, 251);
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 4, 4, 'FD');

      // KPI Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(156, 163, 175);
      doc.text(kpi.label.toUpperCase(), cardX + 8, currentY + 14);

      // KPI Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(14, 33, 24);
      doc.text(kpi.value, cardX + 8, currentY + 30);

      // Extra note if exists
      if (kpi.note) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(16, 185, 129);
        doc.text(kpi.note, cardX + cardWidth - 8, currentY + 30, { align: 'right' });
      }
    });

    currentY += cardHeight + 10;
  }

  // 4. Main Data Table
  autoTable(doc, {
    startY: currentY + 10,
    head: [headers],
    body: rows,
    theme: 'grid',
    margin: { left: 40, right: 40 },
    headStyles: {
      fillColor: [14, 33, 24],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 6
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [31, 41, 55],
      cellPadding: 5.5
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    didParseCell: function(data) {
      // Right align numeric/amount columns
      if (data.column.index === headers.length - 1 || data.column.dataKey === 'amount') {
        data.cell.styles.halign = 'right';
        data.cell.styles.font = 'courier';
      }
      // Highlight total / gross profit rows
      const rawText = String(data.row.raw[1] || data.row.raw[0] || '');
      if (rawText.includes('Gross profit') || rawText.includes('Net profit') || rawText.includes('Total')) {
        data.cell.styles.fontStyle = 'bold';
        if (data.row.raw[1]?.includes('Net profit') || data.row.raw[0]?.includes('Net profit')) {
          data.cell.styles.fillColor = [236, 253, 245]; // soft green highlight
          data.cell.styles.textColor = [6, 95, 70];
        }
      }
    }
  });

  // 5. Sign-off / Signature Footer Block
  const finalY = doc.lastAutoTable.finalY + 35;
  if (finalY < pageHeight - 90) {
    doc.setDrawColor(209, 213, 219);
    doc.line(40, finalY, 190, finalY);
    doc.line(pageWidth - 190, finalY, pageWidth - 40, finalY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text('Prepared by: Accounts Officer', 40, finalY + 12);
    doc.text('(Hamza Khan)', 40, finalY + 22);

    doc.text('Approved by: Director Finance / CEO', pageWidth - 190, finalY + 12);
    doc.text('(Authorized Signatory)', pageWidth - 190, finalY + 22);
  }

  // 6. Page Numbers in Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Confidential — For Internal Management Use Only · Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 20,
      { align: 'center' }
    );
  }

  doc.save(`${filename}.pdf`);
}

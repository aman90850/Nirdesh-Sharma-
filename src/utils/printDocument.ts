import type { ClinicDatabase, PatientBill, PrinterMode } from '../types/clinic';
import { buildUpiLink, qrSvg } from './upi';
import {
  amountInWords,
  computeEodSummary,
  formatCurrency,
  formatDisplayDate,
  formatPaymentModesLabel,
} from './calculations';

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const POWERED_BY_TEXT = 'Powered by Aman Sharma';
const POWERED_BY_HTML = `<div style="margin-top:8px;text-align:center;font-size:9.5px;color:#94A3B8;letter-spacing:0.02em;">${POWERED_BY_TEXT}</div>`;

const SIGMA_LOGO_SVG = `
<svg width="48" height="48" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="60" cy="60" r="56" fill="#FFFFFF" />
  <circle cx="60" cy="60" r="51" stroke="#16A34A" stroke-width="5" />
  <circle cx="60" cy="60" r="43" stroke="#D97706" stroke-width="2" stroke-dasharray="4 3" />
  <path d="M80 35H40L62 60L40 85H80V76H54L71 60L54 44H80V35Z" fill="#1E2B4D" />
  <path d="M60 19V27M56 23H64" stroke="#16A34A" stroke-width="3" stroke-linecap="round" />
</svg>
`;

function buildAdaptiveStyles(mode: PrinterMode): string {
  const pageRule =
    mode === 'pos'
      ? '@page { size: 80mm auto; margin: 2mm; }'
      : mode === 'a4'
        ? '@page { size: A4 portrait; margin: 10mm; }'
        : '@page { margin: 6mm; }';

  const modeVisibility =
    mode === 'pos'
      ? `
        .pos-doc { display: block !important; width: 76mm; max-width: 100%; margin: 0 auto; }
        .a4-doc { display: none !important; }
      `
      : mode === 'a4'
        ? `
          .pos-doc { display: none !important; }
          .a4-doc { display: block !important; width: 100%; }
        `
        : `
          /* Auto-Detect: default to formal A4 on standard printers, switch to POS on <=110mm thermal rolls */
          .pos-doc { display: none; }
          .a4-doc { display: block; width: 100%; }
          @media print and (max-width: 110mm) {
            @page { margin: 2mm; }
            .pos-doc { display: block !important; width: 100% !important; }
            .a4-doc { display: none !important; }
          }
        `;

  return `
    ${pageRule}
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #FFFFFF;
      color: #0F172A;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .mono { font-family: "Consolas", "Courier New", monospace; font-variant-numeric: tabular-nums; }
    .right { text-align: right; }
    .center { text-align: center; }
    .bold { font-weight: 700; }

    /* 80mm Thermal POS Styles */
    .pos-doc {
      font-family: "Consolas", "Courier New", monospace;
      font-size: 11px;
      line-height: 1.35;
      color: #000000;
      padding: 2mm;
    }
    .pos-header {
      text-align: center;
      border-bottom: 1px dashed #000;
      padding-bottom: 6px;
      margin-bottom: 6px;
    }
    .pos-title { font-size: 13px; font-weight: 700; text-transform: uppercase; }
    .pos-sub { font-size: 10px; }
    .pos-block {
      border-bottom: 1px dashed #000;
      padding: 5px 0;
    }
    .pos-row {
      display: flex;
      justify-content: space-between;
      gap: 6px;
      margin: 2px 0;
    }
    .pos-items-head {
      display: flex;
      justify-content: space-between;
      font-weight: 700;
      border-bottom: 1px solid #000;
      padding-bottom: 3px;
      margin-bottom: 4px;
    }
    .pos-footer {
      text-align: center;
      font-size: 10px;
      padding-top: 6px;
    }

    /* A4 Formal Clinic Bill Styles */
    .a4-doc {
      font-size: 12px;
      line-height: 1.45;
      color: #0F172A;
    }
    .a4-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      border-bottom: 2px solid #1E2B4D;
      padding-bottom: 12px;
    }
    .a4-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .a4-center-name {
      font-size: 18px;
      font-weight: 800;
      color: #1E2B4D;
      text-transform: uppercase;
      letter-spacing: -0.01em;
    }
    .a4-meta-box {
      margin-top: 12px;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 10px 12px;
      background: #F8FAFC;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 24px;
      font-size: 11.5px;
    }
    .a4-meta-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    .a4-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
      font-size: 11.5px;
    }
    .a4-table th, .a4-table td {
      border: 1px solid #CBD5E1;
      padding: 7px 9px;
      text-align: left;
    }
    .a4-table th {
      background: #F1F5F9;
      font-weight: 700;
      color: #1E293B;
    }
    .a4-totals-grid {
      margin-top: 14px;
      display: grid;
      grid-template-columns: 7fr 5fr;
      gap: 16px;
      align-items: start;
    }
    .a4-summary-box {
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      overflow: hidden;
    }
    .a4-summary-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 10px;
      border-bottom: 1px solid #E2E8F0;
      font-size: 11.5px;
    }
    .a4-summary-row:last-child { border-bottom: none; }
    .a4-summary-highlight { background: #F8FAFC; font-weight: 700; }
    .a4-footer {
      margin-top: 34px;
      padding-top: 12px;
      border-top: 1px solid #CBD5E1;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 11px;
      color: #475569;
    }
    .a4-kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-top: 12px;
    }
    .a4-kpi {
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 8px 10px;
    }
    .a4-kpi-label { font-size: 10px; color: #64748B; }
    .a4-kpi-val { font-size: 14px; font-weight: 700; margin-top: 2px; }

    ${modeVisibility}
  `;
}

function triggerIframePrint(htmlDocument: string): boolean {
  try {
    const existing = document.getElementById('sigma-hidden-print-frame');
    if (existing) existing.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'sigma-hidden-print-frame';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!frameDoc || !iframe.contentWindow) {
      iframe.remove();
      window.print();
      return true;
    }

    frameDoc.open();
    frameDoc.write(htmlDocument);
    frameDoc.close();

    const win = iframe.contentWindow;
    win.focus();

    const cleanup = () => {
      window.setTimeout(() => {
        if (iframe.parentNode) iframe.remove();
      }, 1500);
    };
    win.onafterprint = cleanup;

    // Trigger print immediately inside click gesture
    win.print();
    return true;
  } catch {
    window.print();
    return true;
  }
}

export function printPatientReceipt(
  patient: PatientBill,
  db: ClinicDatabase,
  mode: PrinterMode
): void {
  // Pay-balance QR, only when money is still due and a UPI ID is set
  const balanceQrHtml = (px: number): string => {
    const link = buildUpiLink(db.settings, patient.balance, `${patient.usgNo} balance`);
    if (!link || patient.balance <= 0) return '';
    return `<div style="display:flex;align-items:center;gap:10px;margin:10px 0;">
      ${qrSvg(link, px)}
      <div style="font-size:11px;line-height:1.4;color:#111;"><strong>Scan to pay balance ${escapeHtml(formatCurrency(patient.balance))}</strong><br/>UPI: ${escapeHtml(db.settings.upiId || '')}</div>
    </div>`;
  };
  const { settings } = db;
  const docName = db.doctors.find((d) => d.id === patient.doctorId)?.name || 'SELF';
  const ashaName = db.ashas.find((a) => a.id === patient.ashaId)?.name || '';
  const contactLine = [settings.address, settings.phone ? `Ph: ${settings.phone}` : '']
    .filter(Boolean)
    .join(' · ');
  const paymentModesText = formatPaymentModesLabel(patient.paymentSummary);
  const statusLabel =
    patient.balance === 0 ? 'PAID IN FULL' : patient.paidAmount > 0 ? 'PARTIAL PAID' : 'UNPAID';

  const posItemsHtml = patient.items
    .map(
      (item, idx) => `
      <div class="pos-row">
        <span>${idx + 1}. ${escapeHtml(item.title)} (${escapeHtml(item.type)})</span>
        <span class="mono">${escapeHtml(item.rate)}</span>
      </div>`
    )
    .join('');

  const a4ItemsHtml = patient.items
    .map(
      (item, idx) => `
      <tr>
        <td class="mono">${idx + 1}</td>
        <td class="bold">${escapeHtml(item.title)}</td>
        <td>${escapeHtml(item.parent)}</td>
        <td class="center mono">${escapeHtml(item.type)}</td>
        <td class="right mono bold">${escapeHtml(formatCurrency(item.rate))}</td>
      </tr>`
    )
    .join('');

  const paymentHistoryHtml =
    patient.payments.length > 0
      ? patient.payments
          .map(
            (p) =>
              `<div style="font-size:10.5px;color:#334155;">• ${escapeHtml(formatDisplayDate(p.date))} — <strong>${escapeHtml(formatCurrency(p.amount))}</strong> (${escapeHtml(p.mode)}) · ${escapeHtml(p.note)}</div>`
          )
          .join('')
      : '';

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt ${escapeHtml(patient.usgNo)} - ${escapeHtml(settings.centerName)}</title>
  <style>${buildAdaptiveStyles(mode)}</style>
</head>
<body>
  <!-- 80mm POS THERMAL RECEIPT -->
  <div class="pos-doc">
    <div class="pos-header">
      <div class="pos-title">${escapeHtml(settings.centerName)}</div>
      ${settings.tagline ? `<div class="pos-sub">${escapeHtml(settings.tagline)}</div>` : ''}
      ${settings.address ? `<div class="pos-sub">${escapeHtml(settings.address)}</div>` : ''}
      ${settings.phone ? `<div class="pos-sub">Ph: ${escapeHtml(settings.phone)}</div>` : ''}
    </div>

    <div class="pos-block">
      <div class="pos-row"><span>Receipt No:</span><span class="bold">${escapeHtml(patient.usgNo)}</span></div>
      <div class="pos-row"><span>Date:</span><span>${escapeHtml(formatDisplayDate(patient.date))}</span></div>
      <div class="pos-row"><span>Patient:</span><span class="bold right">${escapeHtml(patient.title)} ${escapeHtml(patient.name)}</span></div>
      <div class="pos-row"><span>Age / Sex:</span><span>${escapeHtml(patient.ageValue)} ${escapeHtml(patient.ageUnit)} / ${escapeHtml(patient.gender)}</span></div>
      ${patient.phone ? `<div class="pos-row"><span>Phone:</span><span>${escapeHtml(patient.phone)}</span></div>` : ''}
      <div class="pos-row"><span>Ref. Dr:</span><span class="right">${escapeHtml(docName)}</span></div>
    </div>

    <div class="pos-block">
      <div class="pos-items-head"><span>Test Description</span><span>Amt</span></div>
      ${posItemsHtml}
    </div>

    <div class="pos-block">
      <div class="pos-row"><span>Gross Total:</span><span class="mono">${escapeHtml(formatCurrency(patient.totalAmount))}</span></div>
      ${patient.discount > 0 ? `<div class="pos-row"><span>Discount:</span><span class="mono">-${escapeHtml(formatCurrency(patient.discount))}</span></div>` : ''}
      <div class="pos-row bold" style="font-size:12px;"><span>Net Payable:</span><span class="mono">${escapeHtml(formatCurrency(patient.netAmount))}</span></div>
      <div class="pos-row bold"><span>Paid (${escapeHtml(statusLabel)}):</span><span class="mono">${escapeHtml(formatCurrency(patient.paidAmount))}</span></div>
      <div class="pos-sub">Mode: ${escapeHtml(paymentModesText)}</div>
      <div class="pos-row bold"><span>Balance Due:</span><span class="mono">${escapeHtml(formatCurrency(patient.balance))}</span></div>
    </div>

    ${balanceQrHtml(140)}
    <div class="pos-footer">
      <div>Thank you for visiting ${escapeHtml(settings.centerName)}</div>
      <div>Please bring this receipt for report collection.</div>
    </div>
  </div>

  <!-- A4 FORMAL CLINIC RECEIPT -->
  <div class="a4-doc">
    <div class="a4-header">
      <div class="a4-brand">
        ${SIGMA_LOGO_SVG}
        <div>
          <div class="a4-center-name">${escapeHtml(settings.centerName)}</div>
          ${settings.tagline ? `<div style="font-size:11.5px;color:#475569;margin-top:2px;">${escapeHtml(settings.tagline)}</div>` : ''}
          ${contactLine ? `<div style="font-size:11px;color:#64748B;margin-top:2px;">${escapeHtml(contactLine)}</div>` : ''}
        </div>
      </div>
      <div class="right">
        <div style="font-size:11px;font-weight:700;color:#2B4C8C;text-transform:uppercase;">Patient Bill / Receipt</div>
        <div class="mono bold" style="font-size:15px;margin-top:2px;">${escapeHtml(patient.usgNo)}</div>
        <div class="mono" style="font-size:11px;color:#475569;">Date: ${escapeHtml(formatDisplayDate(patient.date))}</div>
      </div>
    </div>

    <div class="a4-meta-box">
      <div class="a4-meta-row"><span style="color:#64748B;">Patient Name:</span><strong>${escapeHtml(patient.title)} ${escapeHtml(patient.name)}</strong></div>
      <div class="a4-meta-row"><span style="color:#64748B;">Referring Doctor:</span><strong>${escapeHtml(docName)}</strong></div>
      <div class="a4-meta-row"><span style="color:#64748B;">Age / Gender:</span><span>${escapeHtml(patient.ageValue)} ${escapeHtml(patient.ageUnit)} / ${escapeHtml(patient.gender)}</span></div>
      <div class="a4-meta-row"><span style="color:#64748B;">Center:</span><span>${escapeHtml(patient.center)}</span></div>
      <div class="a4-meta-row"><span style="color:#64748B;">Mobile No:</span><span class="mono">${escapeHtml(patient.phone || '—')}</span></div>
      <div class="a4-meta-row"><span style="color:#64748B;">Asha / Ref:</span><span>${escapeHtml(ashaName || 'Direct')}</span></div>
    </div>

    <table class="a4-table">
      <thead>
        <tr>
          <th style="width:48px;">S.No</th>
          <th>Investigation / Test Name</th>
          <th style="width:110px;">Category</th>
          <th class="center" style="width:64px;">Code</th>
          <th class="right" style="width:110px;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${a4ItemsHtml}
      </tbody>
    </table>

    <div class="a4-totals-grid">
      <div style="font-size:11.5px;">
        <div><span style="color:#64748B;font-weight:600;">Amount Paid in Words: </span><strong>${escapeHtml(amountInWords(patient.paidAmount))}</strong></div>
        <div style="margin-top:6px;"><span style="color:#64748B;font-weight:600;">Payment Mode: </span><span class="mono">${escapeHtml(paymentModesText)}</span></div>
        <div style="margin-top:6px;"><span style="color:#64748B;font-weight:600;">Status: </span><strong>${escapeHtml(statusLabel)}</strong></div>
        ${patient.remarks ? `<div style="margin-top:6px;"><span style="color:#64748B;font-weight:600;">Remarks: </span>${escapeHtml(patient.remarks)}</div>` : ''}
        ${paymentHistoryHtml ? `<div style="margin-top:8px;padding-top:6px;border-top:1px dashed #CBD5E1;"><div style="font-size:10.5px;font-weight:700;color:#475569;margin-bottom:3px;">Payment Receipts Log</div>${paymentHistoryHtml}</div>` : ''}
      </div>

      <div class="a4-summary-box">
        <div class="a4-summary-row"><span>Gross Total</span><span class="mono bold">${escapeHtml(formatCurrency(patient.totalAmount))}</span></div>
        <div class="a4-summary-row"><span>Discount</span><span class="mono">− ${escapeHtml(formatCurrency(patient.discount))}</span></div>
        <div class="a4-summary-row a4-summary-highlight"><span>Net Payable</span><span class="mono">${escapeHtml(formatCurrency(patient.netAmount))}</span></div>
        <div class="a4-summary-row bold" style="color:#15803D;"><span>Total Paid</span><span class="mono">${escapeHtml(formatCurrency(patient.paidAmount))}</span></div>
        <div class="a4-summary-row bold"><span>Balance Due</span><span class="mono">${escapeHtml(formatCurrency(patient.balance))}</span></div>
      </div>
    </div>

    <div class="a4-footer">
      <div>
        <div>Prepared By: <strong>${escapeHtml(patient.createdBy)}</strong></div>
        <div style="margin-top:2px;">Please bring this receipt at the time of report delivery.</div>
        ${balanceQrHtml(110)}
      </div>
      <div class="right">
        <div style="height:28px;"></div>
        <div style="border-top:1px solid #64748B;padding-top:4px;font-weight:700;color:#0F172A;">
          Authorized Signatory · ${escapeHtml(settings.centerName)}
        </div>
      </div>
    </div>
  </div>
  ${POWERED_BY_HTML}
</body>
</html>`;

  triggerIframePrint(html);
}

export function printEodSummaryDocument(
  dateStr: string,
  db: ClinicDatabase,
  isAdmin: boolean,
  mode: PrinterMode
): void {
  const { settings } = db;
  const eod = computeEodSummary(db, dateStr);
  const contactLine = [settings.address, settings.phone ? `Ph: ${settings.phone}` : '']
    .filter(Boolean)
    .join(' · ');

  const paymentsHtml =
    eod.paymentEntriesToday.length === 0
      ? `<tr><td colspan="5" class="center" style="color:#64748B;">No collections recorded for this date.</td></tr>`
      : eod.paymentEntriesToday
          .map(
            (item) => `
          <tr>
            <td class="mono bold">${escapeHtml(item.usgNo)}</td>
            <td>${escapeHtml(item.patientName)}</td>
            <td class="bold">${escapeHtml(item.mode)}</td>
            <td>${escapeHtml(item.collectedBy)} · ${escapeHtml(item.note)}</td>
            <td class="right mono bold">${escapeHtml(formatCurrency(item.amount))}</td>
          </tr>`
          )
          .join('');

  const expensesHtml =
    eod.expensesToday.length > 0
      ? `
      <h3 style="margin-top:16px;margin-bottom:6px;font-size:12.5px;">Expenses &amp; Cash Credits</h3>
      <table class="a4-table" style="margin-top:0;">
        <thead>
          <tr>
            <th>Particular</th>
            <th>Description</th>
            <th style="width:60px;">Type</th>
            <th class="right" style="width:110px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${eod.expensesToday
            .map(
              (ex) => `
            <tr>
              <td class="bold">${escapeHtml(ex.particular)}</td>
              <td>${escapeHtml(ex.description || '—')}</td>
              <td class="mono bold">${escapeHtml(ex.type)}</td>
              <td class="right mono bold">${escapeHtml(formatCurrency(ex.amount))}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`
      : '';

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>EOD Summary ${escapeHtml(dateStr)} - ${escapeHtml(settings.centerName)}</title>
  <style>${buildAdaptiveStyles(mode)}</style>
</head>
<body>
  <!-- 80mm POS EOD SLIP -->
  <div class="pos-doc">
    <div class="pos-header">
      <div class="pos-title">${escapeHtml(settings.centerName)}</div>
      <div class="bold" style="font-size:11px;margin-top:2px;">END-OF-DAY CLOSING SUMMARY</div>
      <div class="pos-sub">Business Date: ${escapeHtml(formatDisplayDate(dateStr))}</div>
    </div>

    <div class="pos-block">
      <div class="pos-row"><span>Patients Registered:</span><span class="bold">${eod.patientCount}</span></div>
      <div class="pos-row"><span>Tests (USG/X-Ray):</span><span>${eod.totalTests} (${eod.ultrasoundCount}/${eod.xrayCount})</span></div>
      <div class="pos-row"><span>Gross Billed:</span><span>${escapeHtml(formatCurrency(eod.grossBilled))}</span></div>
      <div class="pos-row"><span>Discounts:</span><span>-${escapeHtml(formatCurrency(eod.totalDiscount))}</span></div>
      <div class="pos-row bold"><span>Net Billed:</span><span>${escapeHtml(formatCurrency(eod.netBilled))}</span></div>
    </div>

    <div class="pos-block">
      <div class="bold" style="text-decoration:underline;margin-bottom:3px;">COLLECTION BREAKUP</div>
      <div class="pos-row"><span>Cash Collected:</span><span>${escapeHtml(formatCurrency(eod.cashCollected))}</span></div>
      <div class="pos-row"><span>UPI Collected:</span><span>${escapeHtml(formatCurrency(eod.upiCollected))}</span></div>
      <div class="pos-row"><span>Card Collected:</span><span>${escapeHtml(formatCurrency(eod.cardCollected))}</span></div>
      <div class="pos-row bold"><span>Total Collection:</span><span>${escapeHtml(formatCurrency(eod.totalCollected))}</span></div>
      <div class="pos-row"><span>Pending Balance:</span><span>${escapeHtml(formatCurrency(eod.todayPendingBalance))}</span></div>
    </div>

    <div class="pos-block">
      <div class="pos-row"><span>Cash Credit (CR):</span><span>+${escapeHtml(formatCurrency(eod.totalCR))}</span></div>
      <div class="pos-row"><span>Expenses (DR):</span><span>-${escapeHtml(formatCurrency(eod.totalDR))}</span></div>
      <div class="pos-row bold" style="font-size:12px;margin-top:4px;"><span>NET CASH DRAWER:</span><span>${escapeHtml(formatCurrency(eod.netCashInDrawer))}</span></div>
    </div>

    <div class="pos-footer">
      <div>Printed: ${escapeHtml(new Date().toLocaleString())}</div>
    </div>
  </div>

  <!-- A4 EOD LEDGER -->
  <div class="a4-doc">
    <div class="a4-header">
      <div class="a4-brand">
        ${SIGMA_LOGO_SVG}
        <div>
          <div class="a4-center-name">${escapeHtml(settings.centerName)}</div>
          ${contactLine ? `<div style="font-size:11px;color:#64748B;margin-top:2px;">${escapeHtml(contactLine)}</div>` : ''}
        </div>
      </div>
      <div class="right">
        <div style="font-size:12px;font-weight:700;color:#2B4C8C;text-transform:uppercase;">End-of-Day Transaction Summary</div>
        <div class="mono bold" style="margin-top:3px;">Business Date: ${escapeHtml(formatDisplayDate(dateStr))}</div>
      </div>
    </div>

    <div class="a4-kpi-grid">
      <div class="a4-kpi">
        <div class="a4-kpi-label">Total Collection</div>
        <div class="a4-kpi-val mono" style="color:#2B4C8C;">${escapeHtml(formatCurrency(eod.totalCollected))}</div>
      </div>
      <div class="a4-kpi">
        <div class="a4-kpi-label">Cash / UPI / Card</div>
        <div class="mono bold" style="font-size:11px;margin-top:4px;">${escapeHtml(formatCurrency(eod.cashCollected))} / ${escapeHtml(formatCurrency(eod.upiCollected))} / ${escapeHtml(formatCurrency(eod.cardCollected))}</div>
      </div>
      <div class="a4-kpi">
        <div class="a4-kpi-label">CR / DR Ledger</div>
        <div class="mono bold" style="font-size:11px;margin-top:4px;">+${escapeHtml(formatCurrency(eod.totalCR))} / −${escapeHtml(formatCurrency(eod.totalDR))}</div>
      </div>
      <div class="a4-kpi" style="background:#F8FAFC;">
        <div class="a4-kpi-label bold">Net Cash in Drawer</div>
        <div class="a4-kpi-val mono" style="color:#15803D;">${escapeHtml(formatCurrency(eod.netCashInDrawer))}</div>
      </div>
    </div>

    <h3 style="margin-top:16px;margin-bottom:6px;font-size:12.5px;">Daily Collections (${eod.paymentEntriesToday.length} Entries)</h3>
    <table class="a4-table" style="margin-top:0;">
      <thead>
        <tr>
          <th style="width:90px;">USG No</th>
          <th>Patient</th>
          <th style="width:70px;">Mode</th>
          <th>Operator / Note</th>
          <th class="right" style="width:110px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${paymentsHtml}
      </tbody>
    </table>

    ${expensesHtml}

    <div class="a4-footer">
      <div>
        Tests: ${eod.totalTests} (${eod.ultrasoundCount} USG · ${eod.xrayCount} X-Ray) · Pending Dues: ${escapeHtml(formatCurrency(eod.todayPendingBalance))}
        ${isAdmin ? ` · DC Accrued: ${escapeHtml(formatCurrency(eod.doctorDcAccrued + eod.ashaDcAccrued))}` : ''}
      </div>
      <div class="bold" style="color:#0F172A;">Verified Signatory</div>
    </div>
  </div>
  ${POWERED_BY_HTML}
</body>
</html>`;

  triggerIframePrint(html);
}

export function printPatientTestReport(patient: PatientBill, db: ClinicDatabase): void {
  const { settings } = db;
  const docName = db.doctors.find((d) => d.id === patient.doctorId)?.name || 'SELF';
  const contactLine = [settings.address, settings.phone ? `Ph: ${settings.phone}` : '']
    .filter(Boolean)
    .join(' · ');

  const findingsHtml = patient.items
    .map(
      (item) => `
      <div style="border-bottom:1px solid #E2E8F0;padding:10px 0;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;">
          <strong style="font-size:13px;">${escapeHtml(item.title)}</strong>
          <span class="mono" style="font-size:11px;color:#64748B;">${escapeHtml(item.parent)} · ${escapeHtml(item.status)}</span>
        </div>
        <div style="margin-top:6px;white-space:pre-wrap;font-size:12.5px;color:#1E293B;">${escapeHtml(
          item.findings || 'Report impression pending radiologist review.'
        )}</div>
      </div>`
    )
    .join('');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Report ${escapeHtml(patient.usgNo)} - ${escapeHtml(settings.centerName)}</title>
  <style>${buildAdaptiveStyles('a4')}</style>
</head>
<body>
  <div class="a4-doc">
    <div class="a4-header">
      <div class="a4-brand">
        ${SIGMA_LOGO_SVG}
        <div>
          <div class="a4-center-name">${escapeHtml(settings.centerName)}</div>
          ${settings.tagline ? `<div style="font-size:11.5px;color:#475569;margin-top:2px;">${escapeHtml(settings.tagline)}</div>` : ''}
          ${contactLine ? `<div style="font-size:11px;color:#64748B;margin-top:2px;">${escapeHtml(contactLine)}</div>` : ''}
        </div>
      </div>
      <div class="right">
        <div style="font-size:11px;font-weight:700;color:#2B4C8C;text-transform:uppercase;">Diagnostic Report</div>
        <div class="mono bold" style="font-size:14px;margin-top:2px;">${escapeHtml(patient.usgNo)}</div>
        <div class="mono" style="font-size:11px;color:#475569;">${escapeHtml(formatDisplayDate(patient.date))}</div>
      </div>
    </div>

    <div class="a4-meta-box">
      <div class="a4-meta-row"><span style="color:#64748B;">Patient:</span><strong>${escapeHtml(patient.title)} ${escapeHtml(patient.name)}</strong></div>
      <div class="a4-meta-row"><span style="color:#64748B;">Ref. Doctor:</span><strong>${escapeHtml(docName)}</strong></div>
      <div class="a4-meta-row"><span style="color:#64748B;">Age / Sex:</span><span>${escapeHtml(patient.ageValue)} ${escapeHtml(patient.ageUnit)} / ${escapeHtml(patient.gender)}</span></div>
      <div class="a4-meta-row"><span style="color:#64748B;">Center:</span><span>${escapeHtml(patient.center)}</span></div>
    </div>

    <div style="margin-top:16px;">${findingsHtml}</div>

    <div class="a4-footer" style="margin-top:54px;">
      <div>Prepared By: ${escapeHtml(patient.createdBy)}</div>
      <div class="right">
        <div class="bold" style="color:#0F172A;">Consultant Sonologist / Radiologist</div>
        <div>${escapeHtml(settings.centerName)}</div>
      </div>
    </div>
  </div>
  ${POWERED_BY_HTML}
</body>
</html>`;

  triggerIframePrint(html);
}

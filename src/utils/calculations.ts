import type {
  AshaWorker,
  ClinicDatabase,
  ClinicSettings,
  Doctor,
  PatientBill,
  PaymentEntry,
  PaymentSummary,
} from '../types/clinic';

export function formatCurrency(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `₹${safe.toLocaleString('en-IN', {
    minimumFractionDigits: safe % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

export function computePaymentSummary(payments: PaymentEntry[]): PaymentSummary {
  return payments.reduce<PaymentSummary>(
    (acc, p) => {
      const amt = Number(p.amount) || 0;
      if (p.mode === 'Cash') acc.cash += amt;
      else if (p.mode === 'UPI') acc.upi += amt;
      else if (p.mode === 'Card') acc.card += amt;
      return acc;
    },
    { cash: 0, upi: 0, card: 0 }
  );
}

export function formatPaymentModesLabel(summary: PaymentSummary): string {
  const parts: string[] = [];
  if (summary.cash > 0) parts.push(`Cash ${formatCurrency(summary.cash)}`);
  if (summary.upi > 0) parts.push(`UPI ${formatCurrency(summary.upi)}`);
  if (summary.card > 0) parts.push(`Card ${formatCurrency(summary.card)}`);
  return parts.length > 0 ? parts.join(' + ') : 'Unpaid';
}

export function amountInWords(num: number): string {
  const n = Math.round(Math.abs(num));
  if (n === 0) return 'Rupees Zero Only';
  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const twoDigit = (v: number): string => {
    if (v < 20) return ones[v];
    return `${tens[Math.floor(v / 10)]}${v % 10 ? ' ' + ones[v % 10] : ''}`.trim();
  };

  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = Math.floor((n % 1000) / 100);
  const rest = n % 100;

  if (crore) parts.push(`${twoDigit(crore)} Crore`);
  if (lakh) parts.push(`${twoDigit(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigit(thousand)} Thousand`);
  if (hundred) parts.push(`${ones[hundred]} Hundred`);
  if (rest) parts.push(twoDigit(rest));

  return `Rupees ${parts.join(' ')} Only`;
}

export function buildWhatsAppBillLink(
  patient: PatientBill,
  settings: ClinicSettings,
  doctorName?: string
): string {
  const digits = (patient.phone || '').replace(/\D/g, '');
  let targetPhone = digits;
  if (digits.length === 10) {
    targetPhone = `91${digits}`;
  }

  const testLines = patient.items
    .map((item, idx) => `${idx + 1}. ${item.title} (${item.type}) - ${formatCurrency(item.rate)}`)
    .join('\n');

  const lines = [
    `*${settings.centerName}*`,
    `Receipt / USG No: *${patient.usgNo}*`,
    `Date: ${formatDisplayDate(patient.date)}`,
    `Patient: ${patient.title} ${patient.name} (${patient.ageValue} ${patient.ageUnit} / ${patient.gender})`,
    doctorName ? `Ref. Doctor: ${doctorName}` : '',
    ``,
    `*Tests:*`,
    testLines || '- General Consultation',
    ``,
    `Total Bill: ${formatCurrency(patient.totalAmount)}`,
    patient.discount > 0 ? `Discount: -${formatCurrency(patient.discount)}` : '',
    `Net Payable: ${formatCurrency(patient.netAmount)}`,
    `Paid: *${formatCurrency(patient.paidAmount)}* (${formatPaymentModesLabel(patient.paymentSummary)})`,
    patient.balance > 0 ? `Balance Due: *${formatCurrency(patient.balance)}*` : `Status: *PAID IN FULL*`,
    ``,
    `Thank you for visiting ${settings.centerName}.`,
  ].filter((l) => l !== '');

  const encoded = encodeURIComponent(lines.join('\n'));
  return targetPhone ? `https://wa.me/${targetPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

export interface CommissionRow {
  entityId: string;
  entityName: string;
  phone: string;
  patientCount: number;
  stTestCount: number;
  stAmount: number;
  stPercent: number;
  stCommission: number;
  rtTestCount: number;
  rtAmount: number;
  rtPercent: number;
  rtCommission: number;
  totalBilled: number;
  totalCommission: number;
}

export function computeDoctorCommissionRows(
  patients: PatientBill[],
  doctors: Doctor[],
  fromDate: string,
  toDate: string
): CommissionRow[] {
  const filtered = patients.filter(
    (p) => (!fromDate || p.date >= fromDate) && (!toDate || p.date <= toDate)
  );

  return doctors
    .map((doc) => {
      const docPatients = filtered.filter((p) => p.doctorId === doc.id);
      let stTestCount = 0;
      let stAmount = 0;
      let rtTestCount = 0;
      let rtAmount = 0;

      for (const p of docPatients) {
        for (const item of p.items) {
          if (item.type === 'S.T') {
            stTestCount += 1;
            stAmount += item.rate;
          } else {
            rtTestCount += 1;
            rtAmount += item.rate;
          }
        }
      }

      const stCommission = Math.round((stAmount * doc.usgStPercent) / 100);
      const rtCommission = Math.round((rtAmount * doc.usgRtPercent) / 100);

      return {
        entityId: doc.id,
        entityName: doc.name,
        phone: doc.phone,
        patientCount: docPatients.length,
        stTestCount,
        stAmount,
        stPercent: doc.usgStPercent,
        stCommission,
        rtTestCount,
        rtAmount,
        rtPercent: doc.usgRtPercent,
        rtCommission,
        totalBilled: stAmount + rtAmount,
        totalCommission: stCommission + rtCommission,
      };
    })
    .filter((row) => row.patientCount > 0 || row.totalCommission > 0);
}

export function computeAshaCommissionRows(
  patients: PatientBill[],
  ashas: AshaWorker[],
  fromDate: string,
  toDate: string
): CommissionRow[] {
  const filtered = patients.filter(
    (p) => (!fromDate || p.date >= fromDate) && (!toDate || p.date <= toDate)
  );

  return ashas
    .map((asha) => {
      const ashaPatients = filtered.filter((p) => p.ashaId === asha.id);
      let stTestCount = 0;
      let stAmount = 0;
      let rtTestCount = 0;
      let rtAmount = 0;

      for (const p of ashaPatients) {
        for (const item of p.items) {
          if (item.type === 'S.T') {
            stTestCount += 1;
            stAmount += item.rate;
          } else {
            rtTestCount += 1;
            rtAmount += item.rate;
          }
        }
      }

      const stCommission = Math.round((stAmount * asha.usgStPercent) / 100);
      const rtCommission = Math.round((rtAmount * asha.usgRtPercent) / 100);

      return {
        entityId: asha.id,
        entityName: asha.name,
        phone: asha.phone,
        patientCount: ashaPatients.length,
        stTestCount,
        stAmount,
        stPercent: asha.usgStPercent,
        stCommission,
        rtTestCount,
        rtAmount,
        rtPercent: asha.usgRtPercent,
        rtCommission,
        totalBilled: stAmount + rtAmount,
        totalCommission: stCommission + rtCommission,
      };
    })
    .filter((row) => row.patientCount > 0 || row.totalCommission > 0);
}

export interface EodPaymentItem {
  paymentId: string;
  usgNo: string;
  patientName: string;
  billDate: string;
  mode: 'Cash' | 'UPI' | 'Card';
  amount: number;
  note: string;
  collectedBy: string;
  isOldDueCollection: boolean;
}

export interface EodSummary {
  date: string;
  billsRegisteredToday: PatientBill[];
  patientCount: number;
  totalTests: number;
  ultrasoundCount: number;
  xrayCount: number;
  stCount: number;
  rtCount: number;
  grossBilled: number;
  totalDiscount: number;
  netBilled: number;
  todayPendingBalance: number;
  cashCollected: number;
  upiCollected: number;
  cardCollected: number;
  totalCollected: number;
  oldDuesCollectedToday: number;
  paymentEntriesToday: EodPaymentItem[];
  expensesToday: ClinicDatabase['expenses'];
  totalCR: number;
  totalDR: number;
  netCashInDrawer: number;
  netBusinessPosition: number;
  doctorDcAccrued: number;
  ashaDcAccrued: number;
}

export function computeEodSummary(db: ClinicDatabase, targetDate: string): EodSummary {
  const billsRegisteredToday = db.patients.filter((p) => p.date === targetDate);
  let totalTests = 0;
  let ultrasoundCount = 0;
  let xrayCount = 0;
  let stCount = 0;
  let rtCount = 0;
  let grossBilled = 0;
  let totalDiscount = 0;
  let netBilled = 0;
  let todayPendingBalance = 0;

  for (const bill of billsRegisteredToday) {
    grossBilled += bill.totalAmount;
    totalDiscount += bill.discount;
    netBilled += bill.netAmount;
    todayPendingBalance += bill.balance;
    for (const item of bill.items) {
      totalTests += 1;
      if (item.parent === 'Ultrasound') ultrasoundCount += 1;
      else xrayCount += 1;
      if (item.type === 'S.T') stCount += 1;
      else rtCount += 1;
    }
  }

  let cashCollected = 0;
  let upiCollected = 0;
  let cardCollected = 0;
  let oldDuesCollectedToday = 0;
  const paymentEntriesToday: EodPaymentItem[] = [];

  for (const bill of db.patients) {
    for (const pay of bill.payments) {
      if (pay.date === targetDate) {
        if (pay.mode === 'Cash') cashCollected += pay.amount;
        else if (pay.mode === 'UPI') upiCollected += pay.amount;
        else if (pay.mode === 'Card') cardCollected += pay.amount;

        const isOldDue = bill.date !== targetDate;
        if (isOldDue) oldDuesCollectedToday += pay.amount;

        paymentEntriesToday.push({
          paymentId: pay.id,
          usgNo: bill.usgNo,
          patientName: `${bill.title} ${bill.name}`,
          billDate: bill.date,
          mode: pay.mode,
          amount: pay.amount,
          note: pay.note,
          collectedBy: pay.collectedBy,
          isOldDueCollection: isOldDue,
        });
      }
    }
  }

  const expensesToday = db.expenses.filter((e) => e.date === targetDate);
  const totalCR = expensesToday
    .filter((e) => e.type === 'CR')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalDR = expensesToday
    .filter((e) => e.type === 'DR')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalCollected = cashCollected + upiCollected + cardCollected;
  const netCashInDrawer = cashCollected + totalCR - totalDR;
  const netBusinessPosition = totalCollected + totalCR - totalDR;

  const docRows = computeDoctorCommissionRows(db.patients, db.doctors, targetDate, targetDate);
  const ashaRows = computeAshaCommissionRows(db.patients, db.ashas, targetDate, targetDate);
  const doctorDcAccrued = docRows.reduce((sum, r) => sum + r.totalCommission, 0);
  const ashaDcAccrued = ashaRows.reduce((sum, r) => sum + r.totalCommission, 0);

  return {
    date: targetDate,
    billsRegisteredToday,
    patientCount: billsRegisteredToday.length,
    totalTests,
    ultrasoundCount,
    xrayCount,
    stCount,
    rtCount,
    grossBilled,
    totalDiscount,
    netBilled,
    todayPendingBalance,
    cashCollected,
    upiCollected,
    cardCollected,
    totalCollected,
    oldDuesCollectedToday,
    paymentEntriesToday,
    expensesToday,
    totalCR,
    totalDR,
    netCashInDrawer,
    netBusinessPosition,
    doctorDcAccrued,
    ashaDcAccrued,
  };
}

export function exportToCsv(filename: string, headers: string[], rows: Array<Array<string | number>>): void {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(',')),
  ].join('\n');

  const blob = new Blob([csvLines], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

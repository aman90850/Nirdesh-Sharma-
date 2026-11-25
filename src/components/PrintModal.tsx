import React, { useState } from 'react';
import { MessageCircle, Printer, Receipt, FileText, Sparkles, X } from 'lucide-react';
import type { ClinicDatabase, PatientBill, PrintDocument, PrinterMode } from '../types/clinic';
import {
  amountInWords,
  buildWhatsAppBillLink,
  computeEodSummary,
  formatCurrency,
  formatDisplayDate,
  formatPaymentModesLabel,
} from '../utils/calculations';
import {
  printEodSummaryDocument,
  printPatientReceipt,
  printPatientTestReport,
} from '../utils/printDocument';
import { SigmaLogo } from './SigmaLogo';

interface PrintModalProps {
  doc: PrintDocument | null;
  db: ClinicDatabase;
  isAdmin: boolean;
  defaultPrinterMode: PrinterMode;
  onChangeDefaultPrinterMode: (mode: PrinterMode) => void;
  onClose: () => void;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  doc,
  db,
  isAdmin,
  defaultPrinterMode,
  onChangeDefaultPrinterMode,
  onClose,
}) => {
  const [printerMode, setPrinterMode] = useState<PrinterMode>(defaultPrinterMode);
  const [previewSample, setPreviewSample] = useState<'pos' | 'a4'>(
    defaultPrinterMode === 'pos' ? 'pos' : 'a4'
  );

  if (!doc) return null;

  const { settings } = db;
  const doctorMap = new Map(db.doctors.map((d) => [d.id, d.name]));
  const ashaMap = new Map(db.ashas.map((a) => [a.id, a.name]));

  const handleSelectMode = (mode: PrinterMode) => {
    setPrinterMode(mode);
    onChangeDefaultPrinterMode(mode);
    if (mode === 'pos') setPreviewSample('pos');
    else if (mode === 'a4') setPreviewSample('a4');
  };

  const handlePrint = () => {
    if (doc.kind === 'receipt') {
      printPatientReceipt(doc.patient, db, printerMode);
    } else if (doc.kind === 'eod') {
      printEodSummaryDocument(doc.date, db, isAdmin, printerMode);
    } else {
      printPatientTestReport(doc.patient, db);
    }
  };

  // ============================================================================
  // RENDERERS FOR PATIENT RECEIPT (80mm POS + A4 CLINIC BILL)
  // ============================================================================
  const renderPatientPos = (patient: PatientBill) => {
    const docName = doctorMap.get(patient.doctorId) || 'SELF';
    return (
      <div className="font-mono text-[11px] leading-snug text-black bg-white p-3 w-[302px] mx-auto border border-dashed border-slate-300 print:border-0 print:w-full print:p-0">
        <div className="text-center border-b border-dashed border-black pb-2">
          <div className="font-bold text-[13px] uppercase tracking-tight">{settings.centerName}</div>
          {settings.tagline && <div className="text-[10px]">{settings.tagline}</div>}
          {settings.address && <div className="text-[10px]">{settings.address}</div>}
          {settings.phone && <div className="text-[10px]">Ph: {settings.phone}</div>}
        </div>

        <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[10.5px]">
          <div className="flex justify-between">
            <span>Receipt No:</span>
            <span className="font-bold">{patient.usgNo}</span>
          </div>
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{formatDisplayDate(patient.date)}</span>
          </div>
          <div className="flex justify-between">
            <span>Patient:</span>
            <span className="font-bold text-right">
              {patient.title} {patient.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Age / Sex:</span>
            <span>
              {patient.ageValue} {patient.ageUnit} / {patient.gender}
            </span>
          </div>
          {patient.phone && (
            <div className="flex justify-between">
              <span>Phone:</span>
              <span>{patient.phone}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Ref. Dr:</span>
            <span className="text-right">{docName}</span>
          </div>
        </div>

        <div className="py-2 border-b border-dashed border-black">
          <div className="flex justify-between font-bold border-b border-black pb-1 mb-1">
            <span>Test Description</span>
            <span>Amt</span>
          </div>
          {patient.items.map((item, idx) => (
            <div key={item.id} className="flex justify-between gap-2 py-0.5">
              <span>
                {idx + 1}. {item.title} ({item.type})
              </span>
              <span className="tabular-nums shrink-0">{item.rate}</span>
            </div>
          ))}
        </div>

        <div className="py-2 border-b border-dashed border-black space-y-0.5">
          <div className="flex justify-between">
            <span>Gross Total:</span>
            <span className="tabular-nums">{formatCurrency(patient.totalAmount)}</span>
          </div>
          {patient.discount > 0 && (
            <div className="flex justify-between">
              <span>Discount:</span>
              <span className="tabular-nums">-{formatCurrency(patient.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-[12px] pt-0.5">
            <span>Net Payable:</span>
            <span className="tabular-nums">{formatCurrency(patient.netAmount)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Paid:</span>
            <span className="tabular-nums">{formatCurrency(patient.paidAmount)}</span>
          </div>
          <div className="text-[10px]">Mode: {formatPaymentModesLabel(patient.paymentSummary)}</div>
          <div className="flex justify-between font-bold">
            <span>Balance Due:</span>
            <span className="tabular-nums">{formatCurrency(patient.balance)}</span>
          </div>
        </div>

        <div className="pt-2 text-center text-[10px] space-y-0.5">
          <div>Thank you for visiting {settings.centerName}</div>
          <div>Please bring this slip for report collection.</div>
        </div>
      </div>
    );
  };

  const renderPatientA4 = (patient: PatientBill) => {
    const docName = doctorMap.get(patient.doctorId) || 'SELF';
    const ashaName = ashaMap.get(patient.ashaId) || '';
    return (
      <div className="bg-white text-slate-900 p-6 sm:p-8 border border-slate-200 print:border-0 print:p-0 text-sm">
        {/* Formal Letterhead */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b-2 border-[#1E2B4D]">
          <div className="flex items-center gap-3.5">
            <SigmaLogo size={54} />
            <div>
              <h2 className="font-display text-xl font-extrabold text-[#1E2B4D] uppercase tracking-tight">
                {settings.centerName}
              </h2>
              {settings.tagline && <p className="text-xs font-medium text-slate-600">{settings.tagline}</p>}
              {(settings.address || settings.phone) && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {[settings.address, settings.phone ? `Ph: ${settings.phone}` : '']
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-display text-xs font-bold uppercase tracking-wider text-[#1E2B4D]">
              Patient Bill / Receipt
            </div>
            <div className="mt-1 font-mono text-base font-bold text-slate-900">
              {patient.usgNo}
            </div>
            <div className="text-xs font-mono text-slate-600">
              Date: {formatDisplayDate(patient.date)}
            </div>
          </div>
        </div>

        {/* Two-Column Patient Metadata Grid */}
        <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 print:bg-white">
          <div className="flex justify-between">
            <span className="text-slate-500">Patient Name:</span>
            <span className="font-bold text-slate-900">
              {patient.title} {patient.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Referring Doctor:</span>
            <span className="font-bold text-slate-900">{docName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Age / Gender:</span>
            <span className="font-medium text-slate-900">
              {patient.ageValue} {patient.ageUnit} / {patient.gender}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Center:</span>
            <span className="font-medium text-slate-900">{patient.center}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Mobile No:</span>
            <span className="font-mono text-slate-900">{patient.phone || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Asha / Ref:</span>
            <span className="font-medium text-slate-900">{ashaName || 'Direct'}</span>
          </div>
        </div>

        {/* Tests Table */}
        <table className="mt-5 w-full text-left border-collapse border border-slate-300 text-xs">
          <thead>
            <tr className="bg-slate-100 print:bg-slate-100 border-b border-slate-300 font-semibold text-slate-800">
              <th className="py-2 px-3 border-r border-slate-300 w-12">S.No</th>
              <th className="py-2 px-3 border-r border-slate-300">Investigation / Test Name</th>
              <th className="py-2 px-3 border-r border-slate-300 w-28">Category</th>
              <th className="py-2 px-3 border-r border-slate-300 w-16 text-center">Code</th>
              <th className="py-2 px-3 text-right w-28">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {patient.items.map((item, idx) => (
              <tr key={item.id}>
                <td className="py-2 px-3 border-r border-slate-200 font-mono">{idx + 1}</td>
                <td className="py-2 px-3 border-r border-slate-200 font-semibold text-slate-900">
                  {item.title}
                </td>
                <td className="py-2 px-3 border-r border-slate-200 text-slate-700">{item.parent}</td>
                <td className="py-2 px-3 border-r border-slate-200 text-center font-mono">
                  {item.type}
                </td>
                <td className="py-2 px-3 text-right font-mono font-semibold tabular-nums">
                  {formatCurrency(item.rate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals & Payment Details */}
        <div className="mt-4 grid grid-cols-12 gap-4 items-start">
          <div className="col-span-7 space-y-2 text-xs">
            <div>
              <span className="font-semibold text-slate-600">Amount Paid in Words: </span>
              <span className="font-medium text-slate-900">{amountInWords(patient.paidAmount)}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-600">Payment Breakup: </span>
              <span className="font-mono text-slate-900">
                {formatPaymentModesLabel(patient.paymentSummary)}
              </span>
            </div>
            {patient.remarks && (
              <div>
                <span className="font-semibold text-slate-600">Remarks: </span>
                <span className="text-slate-800">{patient.remarks}</span>
              </div>
            )}
          </div>

          <div className="col-span-5 border border-slate-300 rounded-lg divide-y divide-slate-200 text-xs">
            <div className="px-3 py-1.5 flex justify-between">
              <span>Gross Total</span>
              <span className="font-mono font-semibold tabular-nums">{formatCurrency(patient.totalAmount)}</span>
            </div>
            <div className="px-3 py-1.5 flex justify-between">
              <span>Discount</span>
              <span className="font-mono tabular-nums">− {formatCurrency(patient.discount)}</span>
            </div>
            <div className="px-3 py-1.5 flex justify-between font-bold bg-slate-50">
              <span>Net Payable</span>
              <span className="font-mono tabular-nums">{formatCurrency(patient.netAmount)}</span>
            </div>
            <div className="px-3 py-1.5 flex justify-between font-bold text-emerald-800">
              <span>Total Paid</span>
              <span className="font-mono tabular-nums">{formatCurrency(patient.paidAmount)}</span>
            </div>
            <div className="px-3 py-1.5 flex justify-between font-bold">
              <span>Balance Due</span>
              <span className="font-mono tabular-nums">{formatCurrency(patient.balance)}</span>
            </div>
          </div>
        </div>

        {/* Footer Signature */}
        <div className="mt-10 pt-4 border-t border-slate-200 flex items-end justify-between text-xs text-slate-600">
          <div>
            <div>Prepared By: {patient.createdBy}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Please carry this receipt at the time of report delivery.
            </div>
          </div>
          <div className="text-right">
            <div className="h-8"></div>
            <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
              Authorized Signatory · {settings.centerName}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDERERS FOR END-OF-DAY SUMMARY (80mm POS + A4 LEDGER)
  // ============================================================================
  const renderEodPos = (dateStr: string) => {
    const eod = computeEodSummary(db, dateStr);
    return (
      <div className="font-mono text-[11px] leading-snug text-black bg-white p-3 w-[302px] mx-auto border border-dashed border-slate-300 print:border-0 print:w-full print:p-0">
        <div className="text-center border-b border-dashed border-black pb-2">
          <div className="font-bold text-[13px] uppercase">{settings.centerName}</div>
          <div className="font-bold text-[11px] mt-0.5">END-OF-DAY CLOSING SUMMARY</div>
          <div className="text-[10px]">Business Date: {formatDisplayDate(dateStr)}</div>
        </div>

        <div className="py-2 border-b border-dashed border-black space-y-0.5">
          <div className="flex justify-between">
            <span>Patients Registered:</span>
            <span className="font-bold">{eod.patientCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Tests (USG / X-Ray):</span>
            <span>
              {eod.totalTests} ({eod.ultrasoundCount} / {eod.xrayCount})
            </span>
          </div>
          <div className="flex justify-between">
            <span>Gross Billed:</span>
            <span>{formatCurrency(eod.grossBilled)}</span>
          </div>
          <div className="flex justify-between">
            <span>Discounts:</span>
            <span>-{formatCurrency(eod.totalDiscount)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Net Billed:</span>
            <span>{formatCurrency(eod.netBilled)}</span>
          </div>
        </div>

        <div className="py-2 border-b border-dashed border-black space-y-0.5">
          <div className="font-bold underline mb-1">COLLECTION BREAKUP</div>
          <div className="flex justify-between">
            <span>Cash Collected:</span>
            <span>{formatCurrency(eod.cashCollected)}</span>
          </div>
          <div className="flex justify-between">
            <span>UPI Collected:</span>
            <span>{formatCurrency(eod.upiCollected)}</span>
          </div>
          <div className="flex justify-between">
            <span>Card Collected:</span>
            <span>{formatCurrency(eod.cardCollected)}</span>
          </div>
          <div className="flex justify-between font-bold pt-0.5">
            <span>Total Collection:</span>
            <span>{formatCurrency(eod.totalCollected)}</span>
          </div>
          <div className="flex justify-between">
            <span>Pending Balance:</span>
            <span>{formatCurrency(eod.todayPendingBalance)}</span>
          </div>
        </div>

        <div className="py-2 border-b border-dashed border-black space-y-0.5">
          <div className="flex justify-between">
            <span>Cash Credit (CR):</span>
            <span>+{formatCurrency(eod.totalCR)}</span>
          </div>
          <div className="flex justify-between">
            <span>Expenses Paid (DR):</span>
            <span>-{formatCurrency(eod.totalDR)}</span>
          </div>
          <div className="flex justify-between font-bold text-[12px] pt-1">
            <span>NET CASH IN DRAWER:</span>
            <span>{formatCurrency(eod.netCashInDrawer)}</span>
          </div>
        </div>

        <div className="pt-2 text-center text-[10px]">
          Printed: {new Date().toLocaleString()}
        </div>
      </div>
    );
  };

  const renderEodA4 = (dateStr: string) => {
    const eod = computeEodSummary(db, dateStr);
    return (
      <div className="bg-white text-slate-900 p-6 sm:p-8 border border-slate-200 print:border-0 print:p-0 text-xs">
        <div className="flex items-start justify-between pb-4 border-b-2 border-[#1E2B4D]">
          <div className="flex items-center gap-3">
            <SigmaLogo size={48} />
            <div>
              <h2 className="font-display text-lg font-extrabold text-[#1E2B4D] uppercase">
                {settings.centerName}
              </h2>
              {(settings.address || settings.phone) && (
                <p className="text-slate-600">
                  {[settings.address, settings.phone ? `Ph: ${settings.phone}` : '']
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display font-bold text-sm text-[#1E2B4D] uppercase">
              End-of-day summary
            </div>
            <div className="font-mono font-bold text-slate-900 mt-0.5">
              Business Date: {formatDisplayDate(dateStr)}
            </div>
          </div>
        </div>

        {/* KPI Summary Grid */}
        <div className="mt-4 grid grid-cols-4 gap-3">
          <div className="border border-slate-300 rounded p-2.5">
            <div className="text-[11px] text-slate-500">Total Collection</div>
            <div className="font-mono text-base font-bold text-[#1E2B4D] tabular-nums">
              {formatCurrency(eod.totalCollected)}
            </div>
          </div>
          <div className="border border-slate-300 rounded p-2.5">
            <div className="text-[11px] text-slate-500">Cash / UPI / Card</div>
            <div className="font-mono text-xs font-bold text-slate-900 tabular-nums mt-0.5">
              {formatCurrency(eod.cashCollected)} / {formatCurrency(eod.upiCollected)} / {formatCurrency(eod.cardCollected)}
            </div>
          </div>
          <div className="border border-slate-300 rounded p-2.5">
            <div className="text-[11px] text-slate-500">CR / DR Ledger</div>
            <div className="font-mono text-xs font-bold text-slate-900 tabular-nums mt-0.5">
              +{formatCurrency(eod.totalCR)} / −{formatCurrency(eod.totalDR)}
            </div>
          </div>
          <div className="border border-slate-300 rounded p-2.5 bg-slate-50">
            <div className="text-[11px] text-slate-600 font-semibold">Net Cash in Drawer</div>
            <div className="font-mono text-base font-bold text-emerald-800 tabular-nums">
              {formatCurrency(eod.netCashInDrawer)}
            </div>
          </div>
        </div>

        {/* Itemized Transactions */}
        <h3 className="mt-5 font-display font-bold text-slate-900">
          Daily Collections ({eod.paymentEntriesToday.length} Entries)
        </h3>
        <table className="mt-2 w-full border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 font-semibold">
              <th className="py-1.5 px-2.5 border-r border-slate-300">USG No</th>
              <th className="py-1.5 px-2.5 border-r border-slate-300">Patient</th>
              <th className="py-1.5 px-2.5 border-r border-slate-300">Mode</th>
              <th className="py-1.5 px-2.5 border-r border-slate-300">Operator / Note</th>
              <th className="py-1.5 px-2.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {eod.paymentEntriesToday.map((item) => (
              <tr key={item.paymentId}>
                <td className="py-1.5 px-2.5 border-r border-slate-200 font-mono font-bold">{item.usgNo}</td>
                <td className="py-1.5 px-2.5 border-r border-slate-200">{item.patientName}</td>
                <td className="py-1.5 px-2.5 border-r border-slate-200 font-semibold">{item.mode}</td>
                <td className="py-1.5 px-2.5 border-r border-slate-200">{item.collectedBy} · {item.note}</td>
                <td className="py-1.5 px-2.5 text-right font-mono font-semibold tabular-nums">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {eod.expensesToday.length > 0 && (
          <>
            <h3 className="mt-4 font-display font-bold text-slate-900">Expenses &amp; Cash Credits</h3>
            <table className="mt-2 w-full border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-semibold">
                  <th className="py-1.5 px-2.5 border-r border-slate-300">Particular</th>
                  <th className="py-1.5 px-2.5 border-r border-slate-300">Type</th>
                  <th className="py-1.5 px-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {eod.expensesToday.map((ex) => (
                  <tr key={ex.id}>
                    <td className="py-1.5 px-2.5 border-r border-slate-200">{ex.particular}</td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 font-mono">{ex.type}</td>
                    <td className="py-1.5 px-2.5 text-right font-mono tabular-nums">{formatCurrency(ex.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="mt-6 pt-3 border-t border-slate-200 flex justify-between text-[11px] text-slate-600">
          <div>
            Tests: {eod.totalTests} ({eod.ultrasoundCount} USG · {eod.xrayCount} X-Ray) · Pending Dues: {formatCurrency(eod.todayPendingBalance)}
            {isAdmin && ` · Total DC Accrued: ${formatCurrency(eod.doctorDcAccrued + eod.ashaDcAccrued)}`}
          </div>
          <div className="font-semibold text-slate-900">Verified Signatory</div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDERER FOR PATIENT TEST FINDINGS REPORT
  // ============================================================================
  const renderTestReportA4 = (patient: PatientBill) => {
    const docName = doctorMap.get(patient.doctorId) || 'SELF';
    return (
      <div className="bg-white text-slate-900 p-6 sm:p-8 border border-slate-200 print:border-0 print:p-0 text-sm">
        <div className="flex items-start justify-between pb-4 border-b-2 border-[#1E2B4D]">
          <div className="flex items-center gap-3">
            <SigmaLogo size={52} />
            <div>
              <h2 className="font-display text-xl font-extrabold text-[#1E2B4D] uppercase">
                {settings.centerName}
              </h2>
              {settings.tagline && <p className="text-xs text-slate-600">{settings.tagline}</p>}
              {(settings.address || settings.phone) && (
                <p className="text-xs text-slate-500">
                  {[settings.address, settings.phone ? `Ph: ${settings.phone}` : '']
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </div>
          </div>
          <div className="text-right text-xs">
            <div className="font-display font-bold text-[#1E2B4D] uppercase">Diagnostic Report</div>
            <div className="font-mono font-bold mt-1">{patient.usgNo}</div>
            <div className="font-mono text-slate-600">{formatDisplayDate(patient.date)}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs border border-slate-200 rounded p-3">
          <div><strong>Patient:</strong> {patient.title} {patient.name}</div>
          <div><strong>Ref. Doctor:</strong> {docName}</div>
          <div><strong>Age / Sex:</strong> {patient.ageValue} {patient.ageUnit} / {patient.gender}</div>
          <div><strong>Center:</strong> {patient.center}</div>
        </div>

        <div className="mt-5 space-y-4">
          {patient.items.map((item) => (
            <div key={item.id} className="border-b border-slate-200 pb-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-slate-900">{item.title}</h3>
                <span className="text-xs font-mono text-slate-500">{item.parent} · {item.status}</span>
              </div>
              <p className="mt-2 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                {item.findings || 'Report impression pending radiologist review.'}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-4 border-t border-slate-200 flex justify-end text-xs">
          <div className="text-right">
            <div className="font-bold text-slate-900">Consultant Sonologist / Radiologist</div>
            <div className="text-slate-500">{settings.centerName}</div>
          </div>
        </div>
      </div>
    );
  };

  const posContent =
    doc.kind === 'receipt'
      ? renderPatientPos(doc.patient)
      : doc.kind === 'eod'
        ? renderEodPos(doc.date)
        : renderPatientPos(doc.patient);

  const a4Content =
    doc.kind === 'receipt'
      ? renderPatientA4(doc.patient)
      : doc.kind === 'eod'
        ? renderEodA4(doc.date)
        : renderTestReportA4(doc.patient);

  const waUrl =
    doc.kind === 'receipt'
      ? buildWhatsAppBillLink(doc.patient, settings, doctorMap.get(doc.patient.doctorId))
      : null;

  return (
    <>
      {/* Screen Modal Overlay */}
      <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-6 overflow-y-auto">
        <div className="w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Modal Toolbar */}
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-bold text-slate-900">
                {doc.kind === 'receipt'
                  ? `Print Patient Receipt · ${doc.patient.usgNo}`
                  : doc.kind === 'eod'
                    ? `Print End-of-Day Summary · ${formatDisplayDate(doc.date)}`
                    : `Print Test Report · ${doc.patient.usgNo}`}
              </h2>
              <p className="text-[11px] text-slate-500">
                Auto-Detect adapts automatically to your chosen printer: 80mm POS thermal vs. A4 standard paper.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Printer Mode Selector */}
              <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectMode('auto')}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold cursor-pointer ${
                    printerMode === 'auto' ? 'bg-white text-[#1E2B4D] shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Auto-Detect</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectMode('pos')}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold cursor-pointer ${
                    printerMode === 'pos' ? 'bg-white text-[#1E2B4D] shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <Receipt className="w-3 h-3" />
                  <span>80mm POS</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectMode('a4')}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold cursor-pointer ${
                    printerMode === 'a4' ? 'bg-white text-[#1E2B4D] shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>A4 Bill</span>
                </button>
              </div>

              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Send on WhatsApp</span>
                </a>
              )}

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E2B4D] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#142036] cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Now</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 cursor-pointer"
                aria-label="Close print preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Smart Auto-Detect Preview Toggle Strip */}
          {printerMode === 'auto' && (
            <div className="px-5 py-2 bg-blue-50/70 border-b border-blue-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
              <span>
                <strong>Auto-Detect Active:</strong> When you select a thermal POS printer in Windows Print, it prints the 80mm slip; when you pick an A4 printer, it prints the A4 clinic bill.
              </span>
              <div className="inline-flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Preview:</span>
                <button
                  type="button"
                  onClick={() => setPreviewSample('pos')}
                  className={`rounded px-2 py-0.5 text-[11px] font-semibold cursor-pointer ${
                    previewSample === 'pos' ? 'bg-[#1E2B4D] text-white' : 'bg-white border border-slate-200 text-slate-700'
                  }`}
                >
                  80mm POS
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSample('a4')}
                  className={`rounded px-2 py-0.5 text-[11px] font-semibold cursor-pointer ${
                    previewSample === 'a4' ? 'bg-[#1E2B4D] text-white' : 'bg-white border border-slate-200 text-slate-700'
                  }`}
                >
                  A4 Size
                </button>
              </div>
            </div>
          )}

          {/* Scrollable Visual Preview */}
          <div className="flex-1 overflow-y-auto bg-slate-100 p-5">
            <div className="paper-sheet">
              {printerMode === 'pos' || (printerMode === 'auto' && previewSample === 'pos')
                ? posContent
                : a4Content}
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Hidden Print Portal (Revealed ONLY during @media print) */}
      <div id="sigma-print-portal" data-print-mode={printerMode}>
        <div className="print-layout-pos">{posContent}</div>
        <div className="print-layout-a4">{a4Content}</div>
      </div>
    </>
  );
};

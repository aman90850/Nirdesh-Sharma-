import React from 'react';
import {
  ArrowRight,
  ClipboardPlus,
  FileSpreadsheet,
  FolderSync,
  MessageCircle,
  Printer,
  Wallet,
} from 'lucide-react';
import type { ClinicDatabase, EmployeeAccount, NavRoute, PatientBill } from '../types/clinic';
import {
  buildWhatsAppBillLink,
  computeEodSummary,
  formatCurrency,
  formatDisplayDate,
  formatPaymentModesLabel,
} from '../utils/calculations';
import { getLocalDateISO } from '../data/seedData';

interface DashboardViewProps {
  db: ClinicDatabase;
  currentUser: EmployeeAccount;
  onNavigate: (route: NavRoute) => void;
  onPrintReceipt: (patient: PatientBill) => void;
  onOpenFolderSync: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  db,
  currentUser,
  onNavigate,
  onPrintReceipt,
  onOpenFolderSync,
}) => {
  const today = getLocalDateISO();
  const eod = computeEodSummary(db, today);
  const totalPendingDuesAll = db.patients.reduce((sum, p) => sum + p.balance, 0);

  const doctorMap = new Map(db.doctors.map((d) => [d.id, d.name]));

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            {db.settings.centerName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Business Date: <span className="font-mono font-medium text-slate-700">{formatDisplayDate(today)}</span>
            <span className="mx-2 text-slate-300">·</span>
            Signed in as <span className="font-medium text-slate-700">{currentUser.name}</span> ({currentUser.role})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('patient-add')}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2B4C8C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E3A70] transition-colors whitespace-nowrap cursor-pointer"
          >
            <ClipboardPlus className="w-4 h-4" />
            <span>Register &amp; Bill Patient</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('report-eod')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#16A34A]" />
            <span>End-of-Day Summary</span>
          </button>
        </div>
      </div>

      {/* Core Reference Metrics (Total Patient, Total Dr., Total Asha + Today Cash Drawer) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold text-slate-500">Total Patients</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {db.patients.length}
            </span>
            <span className="text-xs text-slate-500 tabular-nums">
              {eod.patientCount} today
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold text-slate-500">Total Doctors</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {db.doctors.length}
            </span>
            <button
              type="button"
              onClick={() => onNavigate('doctor-view')}
              className="text-xs font-semibold text-[#2B4C8C] hover:underline cursor-pointer"
            >
              View list
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold text-slate-500">Total Asha</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {db.ashas.length}
            </span>
            <button
              type="button"
              onClick={() => onNavigate('asha-view')}
              className="text-xs font-semibold text-[#2B4C8C] hover:underline cursor-pointer"
            >
              View list
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold text-slate-500">Today&apos;s Net Cash in Drawer</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-emerald-700 tabular-nums">
              {formatCurrency(eod.netCashInDrawer)}
            </span>
            <span className="text-xs text-slate-500 tabular-nums">
              Total {formatCurrency(eod.totalCollected)}
            </span>
          </div>
        </div>
      </div>

      {/* Today's Financial Breakdown Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <h2 className="font-display text-sm font-bold text-slate-900">
              Today&apos;s Collection &amp; Split Payment Summary
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('report-eod')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#2B4C8C] hover:underline cursor-pointer"
            >
              <span>Full Closing Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-slate-500">Cash Collected</div>
              <div className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                {formatCurrency(eod.cashCollected)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">UPI Collected</div>
              <div className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                {formatCurrency(eod.upiCollected)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Card Collected</div>
              <div className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                {formatCurrency(eod.cardCollected)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Expenses (DR)</div>
              <div className="mt-1 font-mono text-lg font-bold text-red-600 tabular-nums">
                {formatCurrency(eod.totalDR)}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
            <span>
              Tests Today: <strong className="font-mono text-slate-900">{eod.totalTests}</strong> ({eod.ultrasoundCount} USG · {eod.xrayCount} X-Ray)
            </span>
            <span>
              All Pending Dues: <strong className="font-mono text-amber-700">{formatCurrency(totalPendingDuesAll)}</strong>
            </span>
            {currentUser.role === 'Admin' && (
              <span>
                Today DC Payable: <strong className="font-mono text-slate-900">{formatCurrency(eod.doctorDcAccrued + eod.ashaDcAccrued)}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Portable Folder Sync Quick Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold font-display text-slate-900">
              <FolderSync className="w-4 h-4 text-[#2B4C8C]" />
              <span>Local PC Folder Sync</span>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Your database is stored locally on this PC. Link a sync folder so copying that folder to another computer automatically fetches and merges all clinic data.
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500 truncate">
              {db.settings.linkedFolderName
                ? `Folder: ${db.settings.linkedFolderName}`
                : 'No folder linked yet'}
            </span>
            <button
              type="button"
              onClick={onOpenFolderSync}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
            >
              Manage Sync
            </button>
          </div>
        </div>
      </div>

      {/* Today's Patient Registrations Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-bold text-slate-900">
              Today&apos;s Patient Bills ({eod.billsRegisteredToday.length})
            </h2>
            <p className="text-xs text-slate-500">
              Click Print for smart auto-detecting POS/A4 receipts or send bill details directly on WhatsApp.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('patient-view')}
            className="text-xs font-semibold text-[#2B4C8C] hover:underline cursor-pointer"
          >
            View All Patients
          </button>
        </div>

        {eod.billsRegisteredToday.length === 0 ? (
          <div className="p-10 text-center">
            <Wallet className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="mt-3 text-sm font-medium text-slate-700">No patients billed today yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Register your first patient to generate a sequential USG number and printable receipt.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('patient-add')}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#2B4C8C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E3A70] cursor-pointer"
            >
              <ClipboardPlus className="w-3.5 h-3.5" />
              <span>Add First Patient</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4">Reg No</th>
                  <th className="py-2.5 px-4">Patient</th>
                  <th className="py-2.5 px-4">Doctor</th>
                  <th className="py-2.5 px-4">Tests</th>
                  <th className="py-2.5 px-4 text-right">Net Bill</th>
                  <th className="py-2.5 px-4 text-right">Paid</th>
                  <th className="py-2.5 px-4 text-right">Balance</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {eod.billsRegisteredToday.map((bill) => {
                  const docName = doctorMap.get(bill.doctorId) || 'SELF';
                  const waUrl = buildWhatsAppBillLink(bill, db.settings, docName);
                  return (
                    <tr key={bill.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-xs font-semibold text-[#2B4C8C] whitespace-nowrap">
                        {bill.usgNo}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-900">
                          {bill.title} {bill.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {bill.ageValue} {bill.ageUnit} · {bill.gender}
                          {bill.phone ? ` · ${bill.phone}` : ''}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-700 whitespace-nowrap">
                        {docName}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                        {bill.items.map((i) => i.title).join(', ')}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-medium text-slate-900 tabular-nums">
                        {formatCurrency(bill.netAmount)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="font-mono text-xs font-semibold text-emerald-700 tabular-nums">
                          {formatCurrency(bill.paidAmount)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {formatPaymentModesLabel(bill.paymentSummary)}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-semibold tabular-nums">
                        {bill.balance > 0 ? (
                          <span className="text-amber-700">{formatCurrency(bill.balance)} Due</span>
                        ) : (
                          <span className="text-emerald-700">Paid</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onPrintReceipt(bill)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            title="Print Adaptive Receipt"
                          >
                            <Printer className="w-3.5 h-3.5 text-[#2B4C8C]" />
                            <span>Print</span>
                          </button>
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                            title="Send Bill Summary on WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

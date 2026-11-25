import React from 'react';
import { ClipboardPlus, FileSpreadsheet, MessageCircle, Printer, Wallet } from 'lucide-react';
import type { ClinicDatabase, EmployeeAccount, NavRoute, PatientBill } from '../types/clinic';
import {
  buildWhatsAppBillLink,
  computeEodSummary,
  formatCurrency,
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

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const TillRow: React.FC<{ label: string; value: React.ReactNode; strong?: boolean; tone?: string }> = ({
  label,
  value,
  strong,
  tone = 'text-slate-900',
}) => (
  <div className={`till-row ${strong ? 'text-[17px] font-bold' : 'text-[15px]'}`}>
    <span className={strong ? 'text-slate-900' : 'text-slate-600'}>{label}</span>
    <span className="leader" aria-hidden="true" />
    <span className={`${tone} ${strong ? '' : 'font-semibold'}`}>{value}</span>
  </div>
);

export const DashboardView: React.FC<DashboardViewProps> = ({
  db,
  currentUser,
  onNavigate,
  onPrintReceipt,
  onOpenFolderSync,
}) => {
  const isAdmin = currentUser.role === 'Admin';
  const today = getLocalDateISO();
  const eod = computeEodSummary(db, today);
  const totalPendingDuesAll = db.patients.reduce((sum, p) => sum + p.balance, 0);
  const reportsPending = eod.billsRegisteredToday.reduce(
    (n, b) => n + b.items.filter((i) => i.status === 'Pending').length,
    0
  );
  const doctorMap = new Map(db.doctors.map((d) => [d.id, d.name]));

  const now = new Date();
  const locale = 'en-IN';
  const weekday = now.toLocaleDateString(locale, { weekday: 'long' });
  const dayMonth = now.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });

  const counts: Array<{ label: string; value: number; route: NavRoute }> = [
    { label: 'Patients in register', value: db.patients.length, route: 'patient-view' },
    { label: 'Doctors', value: db.doctors.length, route: 'doctor-view' },
    { label: 'Asha workers', value: db.ashas.length, route: 'asha-view' },
    { label: 'Tests in master', value: db.labTests.length, route: 'lab-master' },
  ];

  return (
    <div className="space-y-7">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-7 items-start">
        {/* Left: the day */}
        <div className="space-y-7 min-w-0">
          <header className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-[15px] text-slate-600">
                {greeting()}, {currentUser.name}
              </p>
              <h1 className="mt-1 font-display text-[clamp(2.25rem,4vw,3.25rem)] font-extrabold leading-[1.02] tracking-[-0.02em] text-[#1E2B4D]">
                {weekday},
                <br />
                {dayMonth}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => onNavigate('patient-add')}
                className="inline-flex items-center gap-2 rounded-md bg-[#128041] px-5 py-3 text-[15px] font-semibold text-white hover:bg-[#0E6A35] transition-colors whitespace-nowrap cursor-pointer"
              >
                <ClipboardPlus className="w-4.5 h-4.5" />
                <span>{'New patient bill'}</span>
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => onNavigate('report-eod')}
                  className="inline-flex items-center gap-2 rounded-md border border-[#1E2B4D]/25 bg-white px-4 py-3 text-[15px] font-semibold text-[#1E2B4D] hover:bg-[#1E2B4D]/5 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <FileSpreadsheet className="w-4.5 h-4.5" />
                  <span>{'Close the day'}</span>
                </button>
              )}
            </div>
          </header>

          {/* Register counts: one strip, not four cards */}
          <nav
            aria-label="Clinic records"
            className="grid grid-cols-2 md:grid-cols-4 rounded-xl border border-[#DCE1DA] bg-white divide-x divide-y md:divide-y-0 divide-[#DCE1DA] overflow-hidden"
          >
            {counts.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => onNavigate(c.route)}
                className="px-5 py-4 text-left hover:bg-[#F5F7F2] transition-colors cursor-pointer"
              >
                <div className="font-display text-[28px] font-bold leading-none text-[#1E2B4D] tabular-nums">{c.value}</div>
                <div className="mt-1.5 text-sm text-slate-600">{c.label}</div>
              </button>
            ))}
          </nav>
        </div>

        {/* Right: the till slip — the day's figures, printed like the clinic's own receipts */}
        <aside aria-label={isAdmin ? "Today's cash summary" : "Today's work"}>
          <div className="till-slip till-print">
            <div className="text-center">
              <div className="font-display text-base font-bold text-[#1E2B4D]">{db.settings.centerName}</div>
              <div className="mt-0.5 text-sm text-slate-500">
                {isAdmin ? 'Till for' : 'Work for'} {now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
            <div className="till-cut" />
            {isAdmin ? (
              <>
                <TillRow label={'Cash'} value={formatCurrency(eod.cashCollected)} />
                <TillRow label={'UPI'} value={formatCurrency(eod.upiCollected)} />
                <TillRow label={'Card'} value={formatCurrency(eod.cardCollected)} />
                <TillRow label={'Collected'} value={formatCurrency(eod.totalCollected)} />
                <TillRow label={'Expenses paid'} value={`− ${formatCurrency(eod.totalDR)}`} tone="text-[#B42318]" />
                <div className="till-cut" />
                <TillRow label={'Cash in drawer'} value={formatCurrency(eod.netCashInDrawer)} strong tone="text-[#0E6A35]" />
                <div className="till-cut" />
                <TillRow label={'Dues outstanding'} value={formatCurrency(totalPendingDuesAll)} tone="text-[#C8740A]" />
                <TillRow label={'DC payable today'} value={formatCurrency(eod.doctorDcAccrued + eod.ashaDcAccrued)} />
                <TillRow label={'Tests done'} value={`${eod.totalTests} (${eod.ultrasoundCount} USG, ${eod.xrayCount} X-ray)`} />
              </>
            ) : (
              <>
                <TillRow label={'Patients billed'} value={eod.patientCount} />
                <TillRow label={'USG scans'} value={eod.ultrasoundCount} />
                <TillRow label={'X-rays'} value={eod.xrayCount} />
                <div className="till-cut" />
                <TillRow label={'Reports pending'} value={reportsPending} strong tone={reportsPending ? 'text-[#C8740A]' : 'text-[#0E6A35]'} />
              </>
            )}
            <div className="mt-4 text-center text-xs text-slate-400">
              {isAdmin ? 'Updates as bills are saved' : 'Money totals are with the Admin'}
            </div>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={onOpenFolderSync}
              className="mt-4 w-full rounded-md border border-[#DCE1DA] bg-white px-4 py-3 text-left text-sm hover:bg-[#F5F7F2] transition-colors cursor-pointer"
            >
              <span className="font-semibold text-[#1E2B4D]">{'Backup folder:'} </span>
              <span className="text-slate-600">{db.settings.linkedFolderName || 'not linked yet'}</span>
            </button>
          )}
        </aside>
      </div>

      {/* Today's Patient Registrations Table */}
      <section className="rounded-xl border border-[#DCE1DA] bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-[#1E2B4D]">
              {"Today's register"}
            </h2>
            <p className="text-sm text-slate-500">
              {eod.billsRegisteredToday.length === 1 ? '1 bill' : `${eod.billsRegisteredToday.length} bills`} so far. Print a receipt or send it on WhatsApp.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('patient-view')}
            className="text-xs font-semibold text-[#1E2B4D] underline-offset-4 hover:underline cursor-pointer"
          >
            {'All patients'}
          </button>
        </div>

        {eod.billsRegisteredToday.length === 0 ? (
          <div className="p-10 text-center">
            <Wallet className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="mt-3 text-[15px] font-semibold text-slate-800">{'No bills yet today'}</p>
            <p className="mt-1 text-sm text-slate-500">
              The first patient you bill gets the next USG number and a receipt to print.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('patient-add')}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#1E2B4D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#142036] cursor-pointer"
            >
              <ClipboardPlus className="w-3.5 h-3.5" />
              <span>{'Bill the first patient'}</span>
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
                      <td className="py-2.5 px-4 font-mono text-xs font-semibold text-[#1E2B4D] whitespace-nowrap">
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
                            <Printer className="w-3.5 h-3.5 text-[#1E2B4D]" />
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
      </section>
    </div>
  );
};

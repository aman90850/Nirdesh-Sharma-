import React, { useMemo, useState } from 'react';
import {
  Download,
  FolderCheck,
  Lock,
  Plus,
  Printer,
  Trash2,
} from 'lucide-react';
import type { ClinicDatabase, EmployeeAccount, ExpenseEntry, ExpenseType } from '../types/clinic';
import {
  computeAshaCommissionRows,
  computeDoctorCommissionRows,
  computeEodSummary,
  exportToCsv,
  formatCurrency,
  formatDisplayDate,
} from '../utils/calculations';
import { getLocalDateISO } from '../data/seedData';
import { ConfirmModal } from './ConfirmModal';

interface ReportModuleProps {
  subView: 'eod' | 'expense-add' | 'expense-view' | 'doctor' | 'dc' | 'progress';
  db: ClinicDatabase;
  currentUser: EmployeeAccount;
  onAddExpense: (entry: ExpenseEntry) => void;
  onDeleteExpense: (id: string) => void;
  onPrintEod: (date: string) => void;
  onSaveDailySnapshot: (date: string) => void;
  onSwitchSubView: (view: 'eod' | 'expense-add' | 'expense-view' | 'doctor' | 'dc' | 'progress') => void;
}

export const ReportModule: React.FC<ReportModuleProps> = ({
  subView,
  db,
  currentUser,
  onAddExpense,
  onDeleteExpense,
  onPrintEod,
  onSaveDailySnapshot,
  onSwitchSubView,
}) => {
  const isAdmin = currentUser.role === 'Admin';
  const today = getLocalDateISO();

  // EOD state
  const [eodDate, setEodDate] = useState(today);

  // Add Expense state
  const [particular, setParticular] = useState('');
  const [description, setDescription] = useState('');
  const [expType, setExpType] = useState<ExpenseType>('DR');
  const [expDate, setExpDate] = useState(today);
  const [expAmount, setExpAmount] = useState('');
  const [expError, setExpError] = useState('');
  const [deleteExpTarget, setDeleteExpTarget] = useState<ExpenseEntry | null>(null);

  // Shared Date Range filters for Expense / Doctor / DC / Progress
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [dcMode, setDcMode] = useState<'doctor' | 'asha'>('doctor');
  const [progressCenter, setProgressCenter] = useState('ALL');
  const [progressTab, setProgressTab] = useState<'summary' | 'usg'>('summary');

  const eod = useMemo(() => computeEodSummary(db, eodDate), [db, eodDate]);
  const doctorMap = useMemo(() => new Map(db.doctors.map((d) => [d.id, d.name])), [db.doctors]);

  // ============================================================================
  // 1. END-OF-DAY (EOD) TRANSACTION SUMMARY
  // ============================================================================
  if (subView === 'eod') {
    const handleExportEodCsv = () => {
      const headers = ['Type', 'Ref / USG No', 'Name / Particular', 'Mode', 'Amount (INR)', 'Operator / Notes'];
      const rows: Array<Array<string | number>> = [];

      for (const p of eod.paymentEntriesToday) {
        rows.push([
          p.isOldDueCollection ? 'Due Collection' : 'Patient Billing',
          p.usgNo,
          p.patientName,
          p.mode,
          p.amount,
          `${p.collectedBy} - ${p.note}`,
        ]);
      }
      for (const ex of eod.expensesToday) {
        rows.push([
          ex.type === 'CR' ? 'Cash Credit (CR)' : 'Expense Debit (DR)',
          ex.type,
          ex.particular,
          'Cash',
          ex.type === 'CR' ? ex.amount : -ex.amount,
          ex.description,
        ]);
      }
      rows.push(['SUMMARY', '', 'Cash Collected', 'Cash', eod.cashCollected, '']);
      rows.push(['SUMMARY', '', 'UPI Collected', 'UPI', eod.upiCollected, '']);
      rows.push(['SUMMARY', '', 'Card Collected', 'Card', eod.cardCollected, '']);
      rows.push(['SUMMARY', '', 'Total Expenses (DR)', 'Cash', -eod.totalDR, '']);
      rows.push(['SUMMARY', '', 'Net Cash in Drawer', 'Cash', eod.netCashInDrawer, '']);

      exportToCsv(`Sigma-EOD-${eodDate}.csv`, headers, rows);
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[1.75rem] font-bold text-[#1E2B4D]">
              End-of-day summary
            </h1>
            <p className="mt-1 text-[15px] text-slate-600">
              The day's money in and out, and every payment taken.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={eodDate}
              max={isAdmin ? undefined : today}
              onChange={(e) => setEodDate(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono font-semibold text-slate-800"
              aria-label="Business Day Date"
            />
            <button
              type="button"
              onClick={() => onPrintEod(eodDate)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E2B4D] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#142036] whitespace-nowrap cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print EOD Summary</span>
            </button>
            <button
              type="button"
              onClick={handleExportEodCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => onSaveDailySnapshot(eodDate)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 whitespace-nowrap cursor-pointer"
            >
              <FolderCheck className="w-3.5 h-3.5" />
              <span>Close Day &amp; Save Backup</span>
            </button>
          </div>
        </div>

        {/* Top Financial Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-semibold text-slate-500">Total Collection ({formatDisplayDate(eodDate)})</div>
            <div className="mt-2 font-mono text-2xl font-bold text-[#1E2B4D] tabular-nums">
              {formatCurrency(eod.totalCollected)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {eod.patientCount} patients · {eod.totalTests} tests
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-semibold text-slate-500">Net Cash in Drawer</div>
            <div className="mt-2 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
              {formatCurrency(eod.netCashInDrawer)}
            </div>
            <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
              Cash {formatCurrency(eod.cashCollected)} + CR {formatCurrency(eod.totalCR)} − DR {formatCurrency(eod.totalDR)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-semibold text-slate-500">Digital Collection (UPI + Card)</div>
            <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {formatCurrency(eod.upiCollected + eod.cardCollected)}
            </div>
            <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
              UPI {formatCurrency(eod.upiCollected)} · Card {formatCurrency(eod.cardCollected)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-semibold text-slate-500">Today&apos;s Pending Balance Dues</div>
            <div className="mt-2 font-mono text-2xl font-bold text-amber-700 tabular-nums">
              {formatCurrency(eod.todayPendingBalance)}
            </div>
            <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
              Discounts: {formatCurrency(eod.totalDiscount)}
            </div>
          </div>
        </div>

        {/* Breakdown Grid: Billing Reconciliation + Category Volume */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-display text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
              Cash &amp; Payment Mode Reconciliation
            </h2>
            <dl className="mt-3 divide-y divide-slate-100 text-xs">
              <div className="py-2 flex justify-between">
                <dt className="text-slate-600">Gross Billed ({eod.patientCount} Patients)</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums">{formatCurrency(eod.grossBilled)}</dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="text-slate-600">Total Discounts Given</dt>
                <dd className="font-mono font-semibold text-slate-700 tabular-nums">− {formatCurrency(eod.totalDiscount)}</dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="text-slate-600">Net Billed Amount</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums">{formatCurrency(eod.netBilled)}</dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="text-slate-600">Cash Received (incl. Split &amp; Dues)</dt>
                <dd className="font-mono font-semibold text-emerald-700 tabular-nums">{formatCurrency(eod.cashCollected)}</dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="text-slate-600">UPI Received</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums">{formatCurrency(eod.upiCollected)}</dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="text-slate-600">Card Received</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums">{formatCurrency(eod.cardCollected)}</dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="text-slate-600">Other Cash Credit (CR)</dt>
                <dd className="font-mono font-semibold text-emerald-700 tabular-nums">+ {formatCurrency(eod.totalCR)}</dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="text-slate-600">Clinic Expenses Paid (DR)</dt>
                <dd className="font-mono font-semibold text-red-600 tabular-nums">− {formatCurrency(eod.totalDR)}</dd>
              </div>
              <div className="pt-3 flex justify-between text-sm">
                <dt className="font-display font-bold text-slate-900">Closing Cash in Drawer</dt>
                <dd className="font-mono font-bold text-emerald-700 tabular-nums">{formatCurrency(eod.netCashInDrawer)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-display text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
              Diagnostic Volume &amp; Operational Breakdown
            </h2>
            <dl className="mt-3 divide-y divide-slate-100 text-xs">
              <div className="py-2 flex justify-between">
                <dt className="text-slate-600">Total Diagnostic Tests Conducted</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums">{eod.totalTests}</dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="text-slate-600">Ultrasound Scans</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums">{eod.ultrasoundCount}</dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="text-slate-600">X-Ray / ECG / 2D-Echo</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums">{eod.xrayCount}</dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="text-slate-600">S.T Category Tests</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums">{eod.stCount}</dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="text-slate-600">R.T Category Tests</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums">{eod.rtCount}</dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="text-slate-600">Prior-Day Dues Collected Today</dt>
                <dd className="font-mono font-semibold text-[#1E2B4D] tabular-nums">
                  {formatCurrency(eod.oldDuesCollectedToday)}
                </dd>
              </div>
              {isAdmin && (
                <>
                  <div className="py-2 flex justify-between">
                    <dt className="text-slate-600">Doctor Commission Accrued (Admin)</dt>
                    <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(eod.doctorDcAccrued)}
                    </dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-slate-600">Asha Commission Accrued (Admin)</dt>
                    <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(eod.ashaDcAccrued)}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        </div>

        {/* Itemized Payment Receipts Table */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-slate-900">
              Itemized Collections ({eod.paymentEntriesToday.length} Entries)
            </h2>
            <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums">
              Total: {formatCurrency(eod.totalCollected)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4">USG No</th>
                  <th className="py-2.5 px-4">Patient</th>
                  <th className="py-2.5 px-4">Payment Mode</th>
                  <th className="py-2.5 px-4">Note</th>
                  <th className="py-2.5 px-4">Operator</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {eod.paymentEntriesToday.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No payment collections recorded for {formatDisplayDate(eodDate)}.
                    </td>
                  </tr>
                ) : (
                  eod.paymentEntriesToday.map((entry) => (
                    <tr key={entry.paymentId} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-mono font-bold text-[#1E2B4D]">{entry.usgNo}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        {entry.patientName}
                        {entry.isOldDueCollection && (
                          <span className="ml-1.5 text-[11px] text-amber-700 font-semibold">
                            (Old Due · {formatDisplayDate(entry.billDate)})
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-700">{entry.mode}</td>
                      <td className="py-2.5 px-4 text-slate-600">{entry.note}</td>
                      <td className="py-2.5 px-4 text-slate-600">{entry.collectedBy}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                        {formatCurrency(entry.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Daily Expenses / Credits Table */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-slate-900">
              Day&apos;s Cash Credits &amp; Expenses ({eod.expensesToday.length})
            </h2>
            <button
              type="button"
              onClick={() => onSwitchSubView('expense-add')}
              className="text-xs font-semibold text-[#1E2B4D] hover:underline cursor-pointer"
            >
              + Add Expense / Credit
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4">Particular</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4 text-right">CR Amount</th>
                  <th className="py-2.5 px-4 text-right">DR Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {eod.expensesToday.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      No expenses or cash credits logged for {formatDisplayDate(eodDate)}.
                    </td>
                  </tr>
                ) : (
                  eod.expensesToday.map((ex) => (
                    <tr key={ex.id}>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{ex.particular}</td>
                      <td className="py-2.5 px-4 text-slate-600">{ex.description || '—'}</td>
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-700">{ex.type}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                        {ex.type === 'CR' ? formatCurrency(ex.amount) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-red-600 tabular-nums">
                        {ex.type === 'DR' ? formatCurrency(ex.amount) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. ADD EXPENSE (CR / DR)
  // ============================================================================
  if (subView === 'expense-add') {
    const handleSaveExpense = (e: React.FormEvent) => {
      e.preventDefault();
      setExpError('');
      const amt = Number(expAmount);
      if (!particular.trim()) {
        setExpError('Particular name is required.');
        return;
      }
      if (Number.isNaN(amt) || amt <= 0) {
        setExpError('Enter an amount greater than 0.');
        return;
      }

      onAddExpense({
        id: `exp-${Date.now()}`,
        date: expDate,
        particular: particular.trim(),
        description: description.trim(),
        type: expType,
        amount: amt,
        createdBy: currentUser.name,
        updatedAt: new Date().toISOString(),
      });

      setParticular('');
      setDescription('');
      setExpAmount('');
      onSwitchSubView('expense-view');
    };

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-[1.75rem] font-bold text-[#1E2B4D]">Add expense</h1>
            <p className="mt-1 text-[15px] text-slate-600">
              Record money paid out (DR) or cash added to the drawer (CR). It shows up in the end-of-day summary.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSwitchSubView('expense-view')}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            View Expenses
          </button>
        </div>

        <form onSubmit={handleSaveExpense} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Particular <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={particular}
                onChange={(e) => setParticular(e.target.value)}
                placeholder="e.g. USG Gel, Tea/Staff, Electricity"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional bill/voucher details"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">CR / DR</label>
              <select
                value={expType}
                onChange={(e) => setExpType(e.target.value as ExpenseType)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
              >
                <option value="DR">DR (Debit / Expense Out)</option>
                <option value="CR">CR (Credit / Cash In)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date</label>
              <input
                type="date"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                placeholder="500"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums"
                required
              />
            </div>
          </div>

          {expError && <p className="text-xs font-medium text-red-600">{expError}</p>}

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E2B4D] px-5 py-2 text-xs font-semibold text-white hover:bg-[#142036] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save Record</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ============================================================================
  // 3. VIEW EXPENSE
  // ============================================================================
  if (subView === 'expense-view') {
    const filteredExp = db.expenses
      .filter((e) => (!fromDate || e.date >= fromDate) && (!toDate || e.date <= toDate))
      .sort((a, b) => b.date.localeCompare(a.date));
    const sumCR = filteredExp.filter((e) => e.type === 'CR').reduce((s, e) => s + e.amount, 0);
    const sumDR = filteredExp.filter((e) => e.type === 'DR').reduce((s, e) => s + e.amount, 0);

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-[1.75rem] font-bold text-[#1E2B4D]">Expenses</h1>
            <p className="mt-1 text-[15px] text-slate-600">
              Money paid out and cash added, by date.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSwitchSubView('expense-add')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E2B4D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#142036] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Expense</span>
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono"
              />
            </div>
          </div>

          {isAdmin && (
          <div className="flex items-center gap-5 text-xs">
            <span>
              Total CR: <strong className="font-mono text-emerald-700">{formatCurrency(sumCR)}</strong>
            </span>
            <span>
              Total DR: <strong className="font-mono text-red-600">{formatCurrency(sumDR)}</strong>
            </span>
          </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4">Sno</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Particular</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4 text-right">CR Amount</th>
                  <th className="py-2.5 px-4 text-right">DR Amount</th>
                  {isAdmin && <th className="py-2.5 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredExp.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-slate-500">
                      No expense entries found in this date range.
                    </td>
                  </tr>
                ) : (
                  filteredExp.map((ex, idx) => (
                    <tr key={ex.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-700">{formatDisplayDate(ex.date)}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{ex.particular}</td>
                      <td className="py-2.5 px-4 text-slate-600">{ex.description || '—'}</td>
                      <td className="py-2.5 px-4 font-mono font-semibold">{ex.type}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                        {ex.type === 'CR' ? formatCurrency(ex.amount) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-red-600 tabular-nums">
                        {ex.type === 'DR' ? formatCurrency(ex.amount) : '—'}
                      </td>
                      {isAdmin && (
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setDeleteExpTarget(ex)}
                            className="rounded border border-red-200 bg-red-50 p-1 text-red-600 hover:bg-red-100 cursor-pointer"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <ConfirmModal
          open={Boolean(deleteExpTarget)}
          title="Delete Expense Record"
          message={`Delete "${deleteExpTarget?.particular}" (${formatCurrency(deleteExpTarget?.amount || 0)}) from the ledger?`}
          confirmLabel="Delete"
          destructive
          onCancel={() => setDeleteExpTarget(null)}
          onConfirm={() => {
            if (deleteExpTarget) {
              onDeleteExpense(deleteExpTarget.id);
              setDeleteExpTarget(null);
            }
          }}
        />
      </div>
    );
  }

  // ============================================================================
  // RBAC GUARD FOR ADMIN-ONLY COMMISSION / DOCTOR REPORTS
  // ============================================================================
  if (!isAdmin && (subView === 'doctor' || subView === 'dc')) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center max-w-lg mx-auto my-8">
        <Lock className="w-8 h-8 text-amber-600 mx-auto" />
        <h2 className="mt-3 font-display text-lg font-bold text-slate-900">Admin Access Required</h2>
        <p className="mt-1.5 text-sm text-slate-600">
          Doctor &amp; Asha Commission (DC) Reports are restricted to Admin accounts to protect referral payout data.
        </p>
      </div>
    );
  }

  // ============================================================================
  // 4. DOCTOR'S REPORT (Admin Only)
  // ============================================================================
  if (subView === 'doctor') {
    const bills = db.patients.filter(
      (p) =>
        (!fromDate || p.date >= fromDate) &&
        (!toDate || p.date <= toDate) &&
        (!selectedDoctorId || p.doctorId === selectedDoctorId)
    );
    const totalBilled = bills.reduce((s, b) => s + b.netAmount, 0);
    const totalPaid = bills.reduce((s, b) => s + b.paidAmount, 0);

    return (
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-[1.75rem] font-bold text-[#1E2B4D]">Doctor referrals</h1>
          <p className="mt-1 text-[15px] text-slate-600">
            Patients and billing referred by each doctor.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 md:grid-cols-4 gap-3.5 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Dr. Name</label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            >
              <option value="">All Doctors</option>
              {db.doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
            />
          </div>
          <div className="text-right">
            <button
              type="button"
              onClick={() =>
                exportToCsv(
                  `Doctor-Report-${fromDate}-to-${toDate}.csv`,
                  ['Date', 'USG No', 'Patient', 'Doctor', 'Tests', 'Net Bill', 'Paid', 'Balance'],
                  bills.map((b) => [
                    b.date,
                    b.usgNo,
                    `${b.title} ${b.name}`,
                    doctorMap.get(b.doctorId) || 'SELF',
                    b.items.map((i) => i.title).join('; '),
                    b.netAmount,
                    b.paidAmount,
                    b.balance,
                  ])
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">{bills.length} Patients Referred</span>
            <div className="flex gap-4">
              <span>Net Billed: <strong className="font-mono">{formatCurrency(totalBilled)}</strong></span>
              <span>Collected: <strong className="font-mono text-emerald-700">{formatCurrency(totalPaid)}</strong></span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Reg No</th>
                  <th className="py-2.5 px-4">Patient</th>
                  <th className="py-2.5 px-4">Doctor</th>
                  <th className="py-2.5 px-4">Tests</th>
                  <th className="py-2.5 px-4 text-right">Net Bill</th>
                  <th className="py-2.5 px-4 text-right">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {bills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No referred patients found for this period.
                    </td>
                  </tr>
                ) : (
                  bills.map((b) => (
                    <tr key={b.id}>
                      <td className="py-2.5 px-4 font-mono">{formatDisplayDate(b.date)}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-[#1E2B4D]">{b.usgNo}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{b.title} {b.name}</td>
                      <td className="py-2.5 px-4">{doctorMap.get(b.doctorId) || 'SELF'}</td>
                      <td className="py-2.5 px-4 text-slate-600">{b.items.map((i) => i.title).join(', ')}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">{formatCurrency(b.netAmount)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-emerald-700 tabular-nums">{formatCurrency(b.paidAmount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 5. DR. DC REPORT & ASHA DC REPORT (Admin Only — S.T % and R.T % Commissions)
  // ============================================================================
  if (subView === 'dc') {
    const rows =
      dcMode === 'doctor'
        ? computeDoctorCommissionRows(db.patients, db.doctors, fromDate, toDate)
        : computeAshaCommissionRows(db.patients, db.ashas, fromDate, toDate);

    const totalCommission = rows.reduce((s, r) => s + r.totalCommission, 0);
    const totalBilled = rows.reduce((s, r) => s + r.totalBilled, 0);

    return (
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-[1.75rem] font-bold text-[#1E2B4D]">
            DC commission
          </h1>
          <p className="mt-1 text-[15px] text-slate-600">
            Commission owed to each doctor and Asha worker, from their S.T and R.T rates.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono"
              />
            </div>
            <button
              type="button"
              onClick={() => setDcMode('doctor')}
              className={`rounded-lg px-4 py-2 text-xs font-semibold cursor-pointer ${
                dcMode === 'doctor'
                  ? 'bg-[#1E2B4D] text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              View DR Dc Report
            </button>
            <button
              type="button"
              onClick={() => setDcMode('asha')}
              className={`rounded-lg px-4 py-2 text-xs font-semibold cursor-pointer ${
                dcMode === 'asha'
                  ? 'bg-[#1E2B4D] text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              View Asha Dc Report
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              exportToCsv(
                `${dcMode.toUpperCase()}-DC-Commission-${fromDate}-to-${toDate}.csv`,
                [
                  dcMode === 'doctor' ? 'Doctor Name' : 'Asha Name',
                  'Patients',
                  'S.T Tests',
                  'S.T Billed',
                  'S.T %',
                  'S.T DC',
                  'R.T Tests',
                  'R.T Billed',
                  'R.T %',
                  'R.T DC',
                  'Total DC Payable',
                ],
                rows.map((r) => [
                  r.entityName,
                  r.patientCount,
                  r.stTestCount,
                  r.stAmount,
                  `${r.stPercent}%`,
                  r.stCommission,
                  r.rtTestCount,
                  r.rtAmount,
                  `${r.rtPercent}%`,
                  r.rtCommission,
                  r.totalCommission,
                ])
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800">
              {dcMode === 'doctor' ? 'Doctor Commission Statement' : 'Asha Commission Statement'}
            </span>
            <div className="flex gap-4">
              <span>Test Volume: <strong className="font-mono">{formatCurrency(totalBilled)}</strong></span>
              <span>Total DC Payable: <strong className="font-mono text-[#1E2B4D]">{formatCurrency(totalCommission)}</strong></span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4">{dcMode === 'doctor' ? 'Doctor Name' : 'Asha Name'}</th>
                  <th className="py-2.5 px-4 text-right">Patients</th>
                  <th className="py-2.5 px-4 text-right">S.T Amount</th>
                  <th className="py-2.5 px-4 text-right">S.T % / DC</th>
                  <th className="py-2.5 px-4 text-right">R.T Amount</th>
                  <th className="py-2.5 px-4 text-right">R.T % / DC</th>
                  <th className="py-2.5 px-4 text-right">Total DC Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No commission entries for the selected date range.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.entityId} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        {r.entityName}
                        {r.phone && <span className="ml-2 font-mono font-normal text-slate-500">{r.phone}</span>}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">{r.patientCount}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {formatCurrency(r.stAmount)} ({r.stTestCount})
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                        {r.stPercent}% → <strong>{formatCurrency(r.stCommission)}</strong>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {formatCurrency(r.rtAmount)} ({r.rtTestCount})
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                        {r.rtPercent}% → <strong>{formatCurrency(r.rtCommission)}</strong>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-[#1E2B4D] tabular-nums">
                        {formatCurrency(r.totalCommission)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 6. DR. PROGRESS REPORT (Center & Category Volume)
  // ============================================================================
  const progressBills = db.patients.filter(
    (p) =>
      (!fromDate || p.date >= fromDate) &&
      (!toDate || p.date <= toDate) &&
      (progressCenter === 'ALL' || p.center === progressCenter)
  );

  const testBreakdownMap = new Map<string, { title: string; parent: string; count: number; amount: number }>();
  for (const b of progressBills) {
    for (const item of b.items) {
      if (progressTab === 'usg' && item.parent !== 'Ultrasound') continue;
      const existing = testBreakdownMap.get(item.title) || {
        title: item.title,
        parent: item.parent,
        count: 0,
        amount: 0,
      };
      existing.count += 1;
      existing.amount += item.rate;
      testBreakdownMap.set(item.title, existing);
    }
  }
  const progressRows = Array.from(testBreakdownMap.values()).sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-[1.75rem] font-bold text-[#1E2B4D]">Progress by center</h1>
        <p className="mt-1 text-[15px] text-slate-600">
          Scans and revenue for each center, USG and X-ray.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Center Name</label>
          <select
            value={progressCenter}
            onChange={(e) => setProgressCenter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
          >
            <option value="ALL">All Centers</option>
            {db.settings.centers.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono"
          />
        </div>
        <button
          type="button"
          onClick={() => setProgressTab('summary')}
          className={`rounded-lg px-4 py-2 text-xs font-semibold cursor-pointer ${
            progressTab === 'summary'
              ? 'bg-[#1E2B4D] text-white'
              : 'border border-slate-200 bg-white text-slate-700'
          }`}
        >
          View Report (All)
        </button>
        <button
          type="button"
          onClick={() => setProgressTab('usg')}
          className={`rounded-lg px-4 py-2 text-xs font-semibold cursor-pointer ${
            progressTab === 'usg'
              ? 'bg-[#1E2B4D] text-white'
              : 'border border-slate-200 bg-white text-slate-700'
          }`}
        >
          View USG Only
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-4">Test Title</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4 text-right">Test Count</th>
                <th className="py-2.5 px-4 text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {progressRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    No test activity recorded in this period.
                  </td>
                </tr>
              ) : (
                progressRows.map((row) => (
                  <tr key={row.title}>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{row.title}</td>
                    <td className="py-2.5 px-4 text-slate-600">{row.parent}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">{row.count}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(row.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

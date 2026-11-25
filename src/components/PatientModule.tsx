import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Lock,
  MessageCircle,
  Pencil,
  Plus,
  Printer,
  Search,
  Split,
  Trash2,
  X,
} from 'lucide-react';
import type {
  ClinicDatabase,
  EmployeeAccount,
  LabTest,
  PatientBill,
  PatientTestItem,
  PaymentEntry,
  PaymentMode,
  TestParent,
  TestType,
} from '../types/clinic';
import {
  buildWhatsAppBillLink,
  computePaymentSummary,
  formatCurrency,
  formatDisplayDate,
  formatPaymentModesLabel,
  buildWhatsAppReportReadyLink,
} from '../utils/calculations';
import { getLocalDateISO } from '../data/seedData';
import { ConfirmModal } from './ConfirmModal';
import { buildUpiLink, qrSvg } from '../utils/upi';

interface PatientModuleProps {
  subView: 'add' | 'view' | 'tests';
  db: ClinicDatabase;
  currentUser: EmployeeAccount;
  editingPatient: PatientBill | null;
  onClearEditing: () => void;
  onStartEdit: (patient: PatientBill) => void;
  onSavePatient: (patient: PatientBill, isEdit: boolean, openPrintAfter: boolean) => void;
  onCollectDue: (patientId: string, newPayments: PaymentEntry[]) => void;
  onUpdateTestItem: (patientId: string, itemId: string, status: 'Pending' | 'Completed', findings: string) => void;
  onDeletePatient: (patientId: string) => void;
  onPrintReceipt: (patient: PatientBill) => void;
  onPrintTestReport: (patient: PatientBill) => void;
  onSwitchSubView: (view: 'add' | 'view' | 'tests') => void;
  onOpenLabMaster: () => void;
  onQuickAddLabTest: (test: LabTest) => void;
}

const TITLES = ['Mr', 'Mrs', 'Ms', 'Dr', 'Master', 'Baby', 'Smt'];
const PAYMENT_MODES: PaymentMode[] = ['Cash', 'UPI', 'Card'];

export const PatientModule: React.FC<PatientModuleProps> = ({
  subView,
  db,
  currentUser,
  editingPatient,
  onClearEditing,
  onStartEdit,
  onSavePatient,
  onCollectDue,
  onUpdateTestItem,
  onDeletePatient,
  onPrintReceipt,
  onPrintTestReport,
  onSwitchSubView,
  onOpenLabMaster,
  onQuickAddLabTest,
}) => {
  const isAdmin = currentUser.role === 'Admin';
  const today = getLocalDateISO();
  const nextUsgNo = `${db.settings.regPrefix}${db.settings.nextRegNumber}`;

  // --- ADD / EDIT PATIENT BILLING FORM STATE ---
  const [date, setDate] = useState(today);
  const [title, setTitle] = useState('Mr');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [ageValue, setAgeValue] = useState('');
  const [ageUnit, setAgeUnit] = useState<'Year' | 'Month' | 'Day'>('Year');
  const [phone, setPhone] = useState('');
  const [center, setCenter] = useState(db.settings.centers[0] || 'HEAD OFFICE');
  const [doctorId, setDoctorId] = useState(db.doctors[0]?.id || '');
  const [ashaId, setAshaId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [selectedItems, setSelectedItems] = useState<PatientTestItem[]>([]);
  const [testSearch, setTestSearch] = useState('');
  const [quickTestTitle, setQuickTestTitle] = useState('');
  const [quickTestRate, setQuickTestRate] = useState('');
  const [quickTestParent, setQuickTestParent] = useState<TestParent>('Ultrasound');
  const [quickTestType, setQuickTestType] = useState<TestType>('S.T');
  const [discount, setDiscount] = useState('0');

  // Single vs Split Payment State
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [singleMode, setSingleMode] = useState<PaymentMode>('Cash');
  const [singlePaid, setSinglePaid] = useState('');
  const [splitCash, setSplitCash] = useState('0');
  const [splitUpi, setSplitUpi] = useState('0');
  const [splitCard, setSplitCard] = useState('0');
  const [formError, setFormError] = useState('');

  // --- VIEW PATIENT FILTERS & MODALS ---
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [nameFilter, setNameFilter] = useState('');
  const [showAllDates, setShowAllDates] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<PatientBill | null>(null);

  // Collect Balance Modal State
  const [duePatient, setDuePatient] = useState<PatientBill | null>(null);
  const [dueSplit, setDueSplit] = useState(false);
  const [dueSingleMode, setDueSingleMode] = useState<PaymentMode>('Cash');
  const [dueSingleAmt, setDueSingleAmt] = useState('');
  const [dueCash, setDueCash] = useState('0');
  const [dueUpi, setDueUpi] = useState('0');
  const [dueCard, setDueCard] = useState('0');
  const [dueNote, setDueNote] = useState('Balance due collected');

  // --- VIEW PATIENT TESTS STATE ---
  const [testStatusFilter, setTestStatusFilter] = useState<'ALL' | 'Pending' | 'Completed'>('ALL');
  const [findingsModal, setFindingsModal] = useState<{
    patient: PatientBill;
    item: PatientTestItem;
    findings: string;
    status: 'Pending' | 'Completed';
  } | null>(null);

  // Load editingPatient when entering edit mode
  useEffect(() => {
    if (editingPatient && subView === 'add') {
      setDate(editingPatient.date);
      setTitle(editingPatient.title);
      setName(editingPatient.name);
      setGender(editingPatient.gender);
      setAgeValue(editingPatient.ageValue);
      setAgeUnit(editingPatient.ageUnit);
      setPhone(editingPatient.phone);
      setCenter(editingPatient.center);
      setDoctorId(editingPatient.doctorId);
      setAshaId(editingPatient.ashaId);
      setRemarks(editingPatient.remarks);
      setSelectedItems(editingPatient.items);
      setDiscount(String(editingPatient.discount));

      const nonZeroModes = [
        editingPatient.paymentSummary.cash > 0,
        editingPatient.paymentSummary.upi > 0,
        editingPatient.paymentSummary.card > 0,
      ].filter(Boolean).length;

      if (nonZeroModes > 1) {
        setIsSplitPayment(true);
        setSplitCash(String(editingPatient.paymentSummary.cash));
        setSplitUpi(String(editingPatient.paymentSummary.upi));
        setSplitCard(String(editingPatient.paymentSummary.card));
      } else {
        setIsSplitPayment(false);
        const mode: PaymentMode =
          editingPatient.paymentSummary.upi > 0
            ? 'UPI'
            : editingPatient.paymentSummary.card > 0
              ? 'Card'
              : 'Cash';
        setSingleMode(mode);
        setSinglePaid(String(editingPatient.paidAmount));
      }
      setFormError('');
    }
  }, [editingPatient, subView]);

  const totalAmount = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.rate, 0),
    [selectedItems]
  );
  const discountNum = Math.max(0, Math.min(totalAmount, Number(discount) || 0));
  const netAmount = Math.max(0, totalAmount - discountNum);

  const computedPaid = useMemo(() => {
    if (isSplitPayment) {
      return (
        Math.max(0, Number(splitCash) || 0) +
        Math.max(0, Number(splitUpi) || 0) +
        Math.max(0, Number(splitCard) || 0)
      );
    }
    return singlePaid === '' ? netAmount : Math.max(0, Number(singlePaid) || 0);
  }, [isSplitPayment, splitCash, splitUpi, splitCard, singlePaid, netAmount]);

  const balanceDue = Math.max(0, netAmount - computedPaid);

  // Amount being paid by UPI right now, for the pay-by-QR panel
  const upiQrAmount = isSplitPayment
    ? Math.max(0, Number(splitUpi) || 0)
    : singleMode === 'UPI'
      ? computedPaid
      : 0;
  const upiQrLink = buildUpiLink(
    db.settings,
    upiQrAmount,
    `${editingPatient?.usgNo || nextUsgNo} ${name}`.trim()
  );

  const matchingCatalogTests = useMemo(() => {
    const q = testSearch.trim().toLowerCase();
    const list = q
      ? db.labTests.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.parent.toLowerCase().includes(q) ||
            t.type.toLowerCase().includes(q)
        )
      : db.labTests;
    return list.slice(0, 12);
  }, [db.labTests, testSearch]);

  const addTestToBill = (test: LabTest) => {
    const newItem: PatientTestItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      testId: test.id,
      title: test.title,
      parent: test.parent,
      type: test.type,
      rate: test.amount,
      status: 'Pending',
      findings: '',
    };
    setSelectedItems((prev) => {
      const next = [...prev, newItem];
      if (!isSplitPayment && singlePaid === '') {
        // Keeps auto-full payment synced
      }
      return next;
    });
    setTestSearch('');
  };

  const removeTestFromBill = (itemId: string) => {
    setSelectedItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const resetBillForm = () => {
    onClearEditing();
    setDate(today);
    setTitle('Mr');
    setName('');
    setGender('Male');
    setAgeValue('');
    setAgeUnit('Year');
    setPhone('');
    setCenter(db.settings.centers[0] || 'HEAD OFFICE');
    setDoctorId(db.doctors[0]?.id || '');
    setAshaId('');
    setRemarks('');
    setSelectedItems([]);
    setTestSearch('');
    setDiscount('0');
    setIsSplitPayment(false);
    setSingleMode('Cash');
    setSinglePaid('');
    setSplitCash('0');
    setSplitUpi('0');
    setSplitCard('0');
    setFormError('');
  };

  const handleSaveBill = (openPrintAfter: boolean) => {
    setFormError('');
    if (!name.trim()) {
      setFormError('Patient Name is required.');
      return;
    }
    if (selectedItems.length === 0) {
      setFormError('Please add at least one Ultrasound or X-Ray test before saving.');
      return;
    }
    if (computedPaid > netAmount) {
      setFormError(`Paid amount (${formatCurrency(computedPaid)}) cannot exceed Net Payable (${formatCurrency(netAmount)}).`);
      return;
    }

    const nowIso = new Date().toISOString();
    const payments: PaymentEntry[] = [];

    if (isSplitPayment) {
      const c = Math.max(0, Number(splitCash) || 0);
      const u = Math.max(0, Number(splitUpi) || 0);
      const cr = Math.max(0, Number(splitCard) || 0);
      if (c > 0) {
        payments.push({
          id: `pay-${Date.now()}-c`,
          date,
          createdAt: nowIso,
          amount: c,
          mode: 'Cash',
          note: 'Billing payment (Split Cash)',
          collectedBy: currentUser.name,
        });
      }
      if (u > 0) {
        payments.push({
          id: `pay-${Date.now()}-u`,
          date,
          createdAt: nowIso,
          amount: u,
          mode: 'UPI',
          note: 'Billing payment (Split UPI)',
          collectedBy: currentUser.name,
        });
      }
      if (cr > 0) {
        payments.push({
          id: `pay-${Date.now()}-cr`,
          date,
          createdAt: nowIso,
          amount: cr,
          mode: 'Card',
          note: 'Billing payment (Split Card)',
          collectedBy: currentUser.name,
        });
      }
    } else if (computedPaid > 0) {
      payments.push({
        id: `pay-${Date.now()}-s`,
        date,
        createdAt: nowIso,
        amount: computedPaid,
        mode: singleMode,
        note: `Billing payment (${singleMode})`,
        collectedBy: currentUser.name,
      });
    }

    const paymentSummary = computePaymentSummary(payments);

    const bill: PatientBill = {
      id: editingPatient ? editingPatient.id : `pat-${Date.now()}`,
      usgNo: editingPatient ? editingPatient.usgNo : nextUsgNo,
      date,
      createdAt: editingPatient ? editingPatient.createdAt : nowIso,
      title,
      name: name.trim().toUpperCase(),
      gender,
      ageValue: ageValue.trim() || '0',
      ageUnit,
      phone: phone.trim(),
      center,
      doctorId,
      ashaId,
      remarks: remarks.trim(),
      items: selectedItems,
      totalAmount,
      discount: discountNum,
      netAmount,
      paidAmount: computedPaid,
      balance: balanceDue,
      paymentSummary,
      payments,
      createdBy: editingPatient ? editingPatient.createdBy : currentUser.name,
      updatedAt: nowIso,
    };

    onSavePatient(bill, Boolean(editingPatient), openPrintAfter);
    resetBillForm();
  };

  const openCollectDueModal = (patient: PatientBill) => {
    setDuePatient(patient);
    setDueSplit(false);
    setDueSingleMode('Cash');
    setDueSingleAmt(String(patient.balance));
    setDueCash(String(patient.balance));
    setDueUpi('0');
    setDueCard('0');
    setDueNote('Balance due collected');
  };

  const handleConfirmCollectDue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!duePatient) return;

    const nowIso = new Date().toISOString();
    const newEntries: PaymentEntry[] = [];

    if (dueSplit) {
      const c = Math.max(0, Number(dueCash) || 0);
      const u = Math.max(0, Number(dueUpi) || 0);
      const cr = Math.max(0, Number(dueCard) || 0);
      const total = c + u + cr;
      if (total <= 0 || total > duePatient.balance) return;
      if (c > 0) {
        newEntries.push({
          id: `pay-${Date.now()}-dc`,
          date: today,
          createdAt: nowIso,
          amount: c,
          mode: 'Cash',
          note: dueNote || 'Balance due (Split Cash)',
          collectedBy: currentUser.name,
        });
      }
      if (u > 0) {
        newEntries.push({
          id: `pay-${Date.now()}-du`,
          date: today,
          createdAt: nowIso,
          amount: u,
          mode: 'UPI',
          note: dueNote || 'Balance due (Split UPI)',
          collectedBy: currentUser.name,
        });
      }
      if (cr > 0) {
        newEntries.push({
          id: `pay-${Date.now()}-dcr`,
          date: today,
          createdAt: nowIso,
          amount: cr,
          mode: 'Card',
          note: dueNote || 'Balance due (Split Card)',
          collectedBy: currentUser.name,
        });
      }
    } else {
      const amt = Math.max(0, Number(dueSingleAmt) || 0);
      if (amt <= 0 || amt > duePatient.balance) return;
      newEntries.push({
        id: `pay-${Date.now()}-ds`,
        date: today,
        createdAt: nowIso,
        amount: amt,
        mode: dueSingleMode,
        note: dueNote || `Balance due (${dueSingleMode})`,
        collectedBy: currentUser.name,
      });
    }

    onCollectDue(duePatient.id, newEntries);
    setDuePatient(null);
  };

  // ---- Returning patient: match on the last 10 digits of the phone number ----
  const [prefillDismissedFor, setPrefillDismissedFor] = useState('');
  const phoneKey = phone.replace(/\D/g, '').slice(-10);
  const returningPatient = useMemo(() => {
    if (editingPatient || phoneKey.length < 10) return null;
    return (
      [...db.patients]
        .filter((p) => p.phone.replace(/\D/g, '').slice(-10) === phoneKey)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0] || null
    );
  }, [db.patients, phoneKey, editingPatient]);

  const fillFromPatient = (p: PatientBill) => {
    setTitle(p.title);
    setName(p.name);
    setGender(p.gender);
    setAgeValue(p.ageValue);
    setAgeUnit(p.ageUnit);
    if (db.doctors.some((d) => d.id === p.doctorId)) setDoctorId(p.doctorId);
    if (!p.ashaId || db.ashas.some((a) => a.id === p.ashaId)) setAshaId(p.ashaId);
    if (p.center) setCenter(p.center);
    setPrefillDismissedFor(phoneKey);
  };

  // ---- Keyboard: Ctrl+S saves and prints the bill ----
  const saveBillRef = useRef(handleSaveBill);
  saveBillRef.current = handleSaveBill;
  useEffect(() => {
    if (subView !== 'add') return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveBillRef.current(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [subView]);

  const doctorMap = useMemo(() => new Map(db.doctors.map((d) => [d.id, d.name])), [db.doctors]);
  const ashaMap = useMemo(() => new Map(db.ashas.map((a) => [a.id, a.name])), [db.ashas]);

  const filteredPatients = useMemo(() => {
    const q = nameFilter.trim().toLowerCase();
    return db.patients
      .filter((p) => {
        if (!showAllDates) {
          if (fromDate && p.date < fromDate) return false;
          if (toDate && p.date > toDate) return false;
        }
        if (q) {
          return (
            p.name.toLowerCase().includes(q) ||
            p.usgNo.toLowerCase().includes(q) ||
            p.phone.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [db.patients, showAllDates, fromDate, toDate, nameFilter]);

  // ============================================================================
  // SUB-VIEW 1: ADD / EDIT PATIENT & SPLIT PAYMENT BILLING
  // ============================================================================
  if (subView === 'add') {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-[1.75rem] font-bold text-[#1E2B4D]">
              {editingPatient ? `Edit bill ${editingPatient.usgNo}` : 'New patient bill'}
            </h1>
            <p className="text-sm text-slate-500">
              Typing a known phone number offers to fill in a returning patient. Shortcuts: Enter adds the first matching test, Ctrl+S saves and prints.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {editingPatient && (
              <button
                type="button"
                onClick={resetBillForm}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                New Patient Instead
              </button>
            )}
            <button
              type="button"
              onClick={() => onSwitchSubView('view')}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              All patients ({db.patients.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Left 7 cols: Patient Demographics + Test Selection */}
          <div className="xl:col-span-7 space-y-5">
            {/* Demographics Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <h2 className="font-display text-sm font-bold text-slate-900">Patient details</h2>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">USG No</label>
                  <input
                    type="text"
                    readOnly
                    value={editingPatient ? editingPatient.usgNo : nextUsgNo}
                    className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-mono font-bold text-[#1E2B4D]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    disabled={!isAdmin && Boolean(editingPatient)}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:border-[#1E2B4D] focus:outline-none disabled:bg-slate-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                  <select
                    value={title}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTitle(val);
                      if (val === 'Mrs' || val === 'Ms' || val === 'Smt') setGender('Female');
                      else if (val === 'Mr' || val === 'Master') setGender('Male');
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-[#1E2B4D] focus:outline-none"
                  >
                    {TITLES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Patient Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full patient name"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#1E2B4D] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'Male' | 'Female' | 'Other')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1E2B4D] focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Age</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="130"
                      value={ageValue}
                      onChange={(e) => setAgeValue(e.target.value)}
                      placeholder="28"
                      className="w-1/2 rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-mono text-slate-900 focus:border-[#1E2B4D] focus:outline-none"
                    />
                    <select
                      value={ageUnit}
                      onChange={(e) => setAgeUnit(e.target.value as 'Year' | 'Month' | 'Day')}
                      className="w-1/2 rounded-lg border border-slate-300 bg-white px-1.5 py-2 text-xs text-slate-900 focus:border-[#1E2B4D] focus:outline-none"
                    >
                      <option value="Year">Year</option>
                      <option value="Month">Month</option>
                      <option value="Day">Day</option>
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:border-[#1E2B4D] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pathology Center
                  </label>
                  <select
                    value={center}
                    onChange={(e) => setCenter(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-[#1E2B4D] focus:outline-none"
                  >
                    {db.settings.centers.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dr. Name</label>
                  <select
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1E2B4D] focus:outline-none"
                  >
                    <option value="">Select Doctor</option>
                    {db.doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Asha Name</label>
                  <select
                    value={ashaId}
                    onChange={(e) => setAshaId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1E2B4D] focus:outline-none"
                  >
                    <option value="">None / Direct</option>
                    {db.ashas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Optional clinical note"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#1E2B4D] focus:outline-none"
                  />
                </div>
              </div>

              {returningPatient && prefillDismissedFor !== phoneKey && (
                <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#B9DCC6] bg-[#EEF7F1] px-4 py-3">
                  <p className="text-[15px] text-slate-800">
                    <strong className="font-semibold">Visited before:</strong> {returningPatient.title} {returningPatient.name},{' '}
                    {returningPatient.ageValue} {returningPatient.ageUnit}, {returningPatient.gender}. Last bill{' '}
                    {returningPatient.usgNo} on {formatDisplayDate(returningPatient.date)}
                    {doctorMap.get(returningPatient.doctorId) ? ` (${doctorMap.get(returningPatient.doctorId)})` : ''}.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fillFromPatient(returningPatient)}
                      className="rounded-md bg-[#128041] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#0E6A35] cursor-pointer"
                    >
                      Fill details
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrefillDismissedFor(phoneKey)}
                      className="rounded-md border border-[#CBD2C9] bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      New patient
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Test Selection Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-sm font-bold text-slate-900">
                  Tests
                </h2>
                <span className="text-xs text-slate-500">
                  {selectedItems.length === 1 ? '1 test added' : `${selectedItems.length} tests added`}
                </span>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (testSearch.trim() && matchingCatalogTests[0]) addTestToBill(matchingCatalogTests[0]);
                    }
                  }}
                  aria-label="Search tests to add"
                  placeholder="Type a test name and press Enter, e.g. whole abdomen"
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-[#1E2B4D] focus:outline-none"
                />
              </div>

              {/* Inline Quick Add Test (works even when USG Master starts empty) */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-700">
                    Test not in the list? Add it here (also saved to the test master)
                  </span>
                  {db.labTests.length === 0 && (
                    <button
                      type="button"
                      onClick={onOpenLabMaster}
                      className="text-[11px] font-semibold text-[#1E2B4D] hover:underline cursor-pointer"
                    >
                      Open USG Master
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input
                    type="text"
                    value={quickTestTitle}
                    onChange={(e) => setQuickTestTitle(e.target.value)}
                    placeholder="Test name (e.g. USG WHOLE ABDOMEN)"
                    className="sm:col-span-5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#1E2B4D] focus:outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    value={quickTestRate}
                    onChange={(e) => setQuickTestRate(e.target.value)}
                    placeholder="Rate ₹"
                    className="sm:col-span-2 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono tabular-nums text-slate-900 focus:border-[#1E2B4D] focus:outline-none"
                  />
                  <select
                    value={quickTestParent}
                    onChange={(e) => setQuickTestParent(e.target.value as TestParent)}
                    className="sm:col-span-2 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900"
                  >
                    <option value="Ultrasound">Ultrasound</option>
                    <option value="X-Ray">X-Ray</option>
                  </select>
                  <select
                    value={quickTestType}
                    onChange={(e) => setQuickTestType(e.target.value as TestType)}
                    className="sm:col-span-1 rounded-md border border-slate-300 bg-white px-1.5 py-1.5 text-xs font-mono text-slate-900"
                  >
                    <option value="S.T">S.T</option>
                    <option value="R.T">R.T</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = quickTestTitle.trim();
                      const rate = Number(quickTestRate);
                      if (!trimmed || Number.isNaN(rate) || rate < 0) return;
                      const created: LabTest = {
                        id: `test-${Date.now()}`,
                        title: trimmed.toUpperCase(),
                        amount: rate,
                        parent: quickTestParent,
                        type: quickTestType,
                        updatedAt: new Date().toISOString(),
                      };
                      onQuickAddLabTest(created);
                      addTestToBill(created);
                      setQuickTestTitle('');
                      setQuickTestRate('');
                    }}
                    className="sm:col-span-2 inline-flex items-center justify-center gap-1 rounded-md bg-[#1E2B4D] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#142036] cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Quick clickable catalog suggestions */}
              {db.labTests.length > 0 && (
                <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                  {matchingCatalogTests.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No saved tests match &ldquo;{testSearch}&rdquo;. Use Quick Add above to add it directly.
                    </div>
                  ) : (
                    matchingCatalogTests.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => addTestToBill(t)}
                        className="w-full px-3.5 py-2 flex items-center justify-between gap-2 text-left hover:bg-blue-50/60 transition-colors cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 truncate">{t.title}</div>
                          <div className="text-[11px] text-slate-500">
                            {t.parent} · <span className="font-mono">{t.type}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-xs font-bold text-slate-800 tabular-nums">
                            {formatCurrency(t.amount)}
                          </span>
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#1E2B4D] text-white">
                            <Plus className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Selected Tests List */}
              {selectedItems.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                        <th className="py-2 px-3">Selected Test</th>
                        <th className="py-2 px-3">Category / Type</th>
                        <th className="py-2 px-3 text-right">Rate</th>
                        <th className="py-2 px-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {selectedItems.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2 px-3 font-semibold text-slate-900">{item.title}</td>
                          <td className="py-2 px-3 text-slate-600">
                            {item.parent} · <span className="font-mono">{item.type}</span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                            {formatCurrency(item.rate)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeTestFromBill(item.id)}
                              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                              aria-label={`Remove ${item.title}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right 5 cols: Billing & Split Payment Panel */}
          <div className="xl:col-span-5 rounded-xl border border-slate-200 bg-white p-5 space-y-5 sticky top-20">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-display text-sm font-bold text-slate-900">
                Billing &amp; Payment Collection
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (!isSplitPayment) {
                    setSplitCash(String(netAmount));
                    setSplitUpi('0');
                    setSplitCard('0');
                  } else {
                    setSinglePaid(String(netAmount));
                  }
                  setIsSplitPayment((prev) => !prev);
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  isSplitPayment
                    ? 'border-[#1E2B4D] bg-blue-50 text-[#1E2B4D]'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Split className="w-3.5 h-3.5" />
                <span>{isSplitPayment ? 'Split Payment On' : 'Enable Split Payment'}</span>
              </button>
            </div>

            {/* Totals Breakdown */}
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Gross Total</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(totalAmount)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <label htmlFor="bill-discount" className="text-slate-600">
                  Discount (₹)
                </label>
                <input
                  id="bill-discount"
                  type="number"
                  min="0"
                  max={totalAmount}
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-28 rounded-lg border border-slate-300 px-2.5 py-1 text-right font-mono text-sm tabular-nums text-slate-900 focus:border-[#1E2B4D] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="font-display font-bold text-slate-900">Net Payable</span>
                <span className="font-mono text-lg font-bold text-[#1E2B4D] tabular-nums">
                  {formatCurrency(netAmount)}
                </span>
              </div>
            </div>

            {/* Single vs Split Payment Controls */}
            {!isSplitPayment ? (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Payment Mode
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_MODES.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setSingleMode(mode)}
                        className={`rounded-lg border py-2 text-xs font-semibold transition-colors cursor-pointer ${
                          singleMode === mode
                            ? 'border-[#1E2B4D] bg-[#1E2B4D] text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">Paid Amount (₹)</label>
                    <button
                      type="button"
                      onClick={() => setSinglePaid(String(netAmount))}
                      className="text-[11px] font-semibold text-[#1E2B4D] hover:underline cursor-pointer"
                    >
                      Full ({formatCurrency(netAmount)})
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={netAmount}
                    value={singlePaid === '' ? String(netAmount) : singlePaid}
                    onChange={(e) => setSinglePaid(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right font-mono text-sm font-semibold tabular-nums text-slate-900 focus:border-[#1E2B4D] focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="text-xs font-semibold text-slate-700">
                  Split Payment Allocation (Cash + UPI + Card)
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Cash (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={splitCash}
                      onChange={(e) => setSplitCash(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-right font-mono text-sm tabular-nums focus:border-[#1E2B4D] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">UPI (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={splitUpi}
                      onChange={(e) => setSplitUpi(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-right font-mono text-sm tabular-nums focus:border-[#1E2B4D] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Card (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={splitCard}
                      onChange={(e) => setSplitCard(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-right font-mono text-sm tabular-nums focus:border-[#1E2B4D] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Split Total Collected</span>
                  <span className="font-mono font-bold text-emerald-700 tabular-nums">
                    {formatCurrency(computedPaid)}
                  </span>
                </div>
              </div>
            )}

            {upiQrLink && (
              <div className="flex items-center gap-4 rounded-md border border-[#DCE1DA] bg-white p-3">
                <div className="shrink-0" dangerouslySetInnerHTML={{ __html: qrSvg(upiQrLink, 116) }} />
                <div className="text-sm text-slate-700">
                  <div className="font-display text-lg font-bold text-[#1E2B4D]">Scan to pay {formatCurrency(upiQrAmount)}</div>
                  <div>Any UPI app: GPay, PhonePe, Paytm, BHIM</div>
                  <div className="mt-1 text-slate-500">To {db.settings.upiId}. Check the payment on your phone before saving.</div>
                </div>
              </div>
            )}

            {/* Balance Status Summary */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Balance Due</span>
              <span
                className={`font-mono text-base font-bold tabular-nums ${
                  balanceDue > 0 ? 'text-amber-700' : 'text-emerald-700'
                }`}
              >
                {balanceDue > 0 ? `${formatCurrency(balanceDue)} Pending` : '₹0 (Paid in Full)'}
              </span>
            </div>

            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {formError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleSaveBill(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#128041] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0E6A35] transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{editingPatient ? 'Update & Print' : 'Save & Print Receipt'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveBill(false)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1E2B4D] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#142036] transition-colors cursor-pointer"
              >
                <span>{editingPatient ? 'Update Bill Only' : 'Save Bill Only'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // SUB-VIEW 2: VIEW PATIENTS RECORD (Search, Print, WhatsApp, Collect Due, RBAC)
  // ============================================================================
  if (subView === 'view') {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-[1.75rem] font-bold text-[#1E2B4D]">Patients</h1>
            <p className="mt-1 text-[15px] text-slate-600">
              Find a bill, reprint a receipt, send it on WhatsApp or collect a balance.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetBillForm();
              onSwitchSubView('add');
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E2B4D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#142036] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Patient</span>
          </button>
        </div>

        {/* Search & Date Filter Bar */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setShowAllDates(false);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setShowAllDates(false);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900"
            />
          </div>
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Patient Name / Reg No / Phone
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                placeholder="Search patient..."
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900"
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={() => setShowAllDates((prev) => !prev)}
              className={`w-full rounded-lg border px-3 py-2 text-xs font-semibold cursor-pointer h-[38px] ${
                showAllDates
                  ? 'border-[#1E2B4D] bg-blue-50 text-[#1E2B4D]'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {showAllDates ? 'Showing All Dates' : 'Show All Dates'}
            </button>
          </div>
        </div>

        {/* Patients Table */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-3">S.No</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">RegNo</th>
                  <th className="py-2.5 px-3">Patient Name</th>
                  <th className="py-2.5 px-3">Doctor / Asha</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-right">Disc.</th>
                  <th className="py-2.5 px-3 text-right">Paid</th>
                  <th className="py-2.5 px-3 text-right">Bal.</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-500">
                      No patient records match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((p, idx) => {
                    const docName = doctorMap.get(p.doctorId) || 'SELF';
                    const ashaName = ashaMap.get(p.ashaId) || '';
                    const isBackdated = p.date !== today;
                    const canEdit = isAdmin || !isBackdated;
                    const waUrl = buildWhatsAppBillLink(p, db.settings, docName);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-mono text-slate-500 tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                          {formatDisplayDate(p.date)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#1E2B4D] whitespace-nowrap">
                          {p.usgNo}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">
                            {p.title} {p.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {p.ageValue} {p.ageUnit} · {p.gender}
                            {p.phone ? ` · ${p.phone}` : ''}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-800">{docName}</div>
                          {ashaName && <div className="text-[11px] text-slate-500">{ashaName}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-900 tabular-nums">
                          {formatCurrency(p.totalAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600 tabular-nums">
                          {formatCurrency(p.discount)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="font-mono font-semibold text-emerald-700 tabular-nums">
                            {formatCurrency(p.paidAmount)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {formatPaymentModesLabel(p.paymentSummary)}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                          {p.balance > 0 ? (
                            <span className="text-amber-700">{formatCurrency(p.balance)}</span>
                          ) : (
                            <span className="text-emerald-700">₹0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onPrintReceipt(p)}
                              className="inline-flex items-center gap-1 rounded border border-[#1E2B4D]/30 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-[#1E2B4D] hover:bg-blue-100 cursor-pointer"
                              title="Print Patient Bill Receipt (POS / A4)"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Print Receipt</span>
                            </button>

                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                              title="Send Bill Summary on WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>WA</span>
                            </a>

                            {p.balance > 0 && (
                              <button
                                type="button"
                                onClick={() => openCollectDueModal(p)}
                                className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 cursor-pointer"
                                title="Collect Pending Balance"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>Due</span>
                              </button>
                            )}

                            {canEdit ? (
                              <button
                                type="button"
                                onClick={() => onStartEdit(p)}
                                className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 cursor-pointer"
                                title="Edit Bill"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            ) : (
                              <span
                                className="rounded border border-slate-100 bg-slate-50 p-1 text-slate-300"
                                title="Users cannot edit previous-date bills"
                              >
                                <Lock className="w-3 h-3" />
                              </span>
                            )}

                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(p)}
                                className="rounded border border-red-200 bg-red-50 p-1 text-red-600 hover:bg-red-100 cursor-pointer"
                                title="Delete Bill (Admin only)"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Collect Balance Due Modal (Single or Split Payment) */}
        {duePatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <form
              onSubmit={handleConfirmCollectDue}
              className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Collect Pending Due · {duePatient.usgNo}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {duePatient.title} {duePatient.name} · Pending:{' '}
                    <strong className="font-mono text-amber-700">
                      {formatCurrency(duePatient.balance)}
                    </strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDuePatient(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Collection Mode</span>
                <button
                  type="button"
                  onClick={() => setDueSplit((prev) => !prev)}
                  className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                    dueSplit
                      ? 'border-[#1E2B4D] bg-blue-50 text-[#1E2B4D]'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <Split className="w-3 h-3" />
                  <span>{dueSplit ? 'Split Payment On' : 'Split Payment'}</span>
                </button>
              </div>

              {!dueSplit ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_MODES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDueSingleMode(m)}
                        className={`rounded-lg border py-1.5 text-xs font-semibold cursor-pointer ${
                          dueSingleMode === m
                            ? 'border-[#1E2B4D] bg-[#1E2B4D] text-white'
                            : 'border-slate-200 text-slate-700'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Amount Received (₹)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={duePatient.balance}
                      value={dueSingleAmt}
                      onChange={(e) => setDueSingleAmt(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right font-mono text-sm font-semibold"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cash</label>
                    <input
                      type="number"
                      min="0"
                      value={dueCash}
                      onChange={(e) => setDueCash(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-right font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">UPI</label>
                    <input
                      type="number"
                      min="0"
                      value={dueUpi}
                      onChange={(e) => setDueUpi(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-right font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Card</label>
                    <input
                      type="number"
                      min="0"
                      value={dueCard}
                      onChange={(e) => setDueCard(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-right font-mono text-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Note</label>
                <input
                  type="text"
                  value={dueNote}
                  onChange={(e) => setDueNote(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDuePatient(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#128041] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0E6A35] cursor-pointer"
                >
                  Record Collection
                </button>
              </div>
            </form>
          </div>
        )}

        <ConfirmModal
          open={Boolean(deleteTarget)}
          title="Delete Patient Bill"
          message={`Permanently delete bill ${deleteTarget?.usgNo} for ${deleteTarget?.title} ${deleteTarget?.name}? This action updates today's closing totals.`}
          confirmLabel="Delete Bill"
          destructive
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            if (deleteTarget) {
              onDeletePatient(deleteTarget.id);
              setDeleteTarget(null);
            }
          }}
        />
      </div>
    );
  }

  // ============================================================================
  // SUB-VIEW 3: VIEW PATIENT TEST REPORT
  // ============================================================================
  const flattenedTests = filteredPatients.flatMap((patient) =>
    patient.items
      .filter((item) => testStatusFilter === 'ALL' || item.status === testStatusFilter)
      .map((item) => ({ patient, item }))
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-[1.75rem] font-bold text-[#1E2B4D]">Test reports</h1>
        <p className="mt-1 text-[15px] text-slate-600">
          Mark scans done, write findings, print reports and tell the patient on WhatsApp.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setShowAllDates(false);
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setShowAllDates(false);
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowAllDates((prev) => !prev)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            {showAllDates ? 'All Dates' : 'Filtered Dates'}
          </button>
        </div>

        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          {(['ALL', 'Pending', 'Completed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setTestStatusFilter(st)}
              className={`rounded-md px-3 py-1 text-xs font-semibold cursor-pointer ${
                testStatusFilter === st ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {st === 'ALL' ? 'All Tests' : st}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Reg No</th>
                <th className="py-2.5 px-4">Patient</th>
                <th className="py-2.5 px-4">Test Title</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {flattenedTests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No test records found.
                  </td>
                </tr>
              ) : (
                flattenedTests.map(({ patient, item }) => (
                  <tr key={`${patient.id}-${item.id}`} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {formatDisplayDate(patient.date)}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-[#1E2B4D]">
                      {patient.usgNo}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {patient.title} {patient.name}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900">{item.title}</div>
                      {item.findings && (
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          {item.findings}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {item.parent} · <span className="font-mono">{item.type}</span>
                    </td>
                    <td className="py-2.5 px-4 font-semibold">
                      {item.status === 'Completed' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Completed
                        </span>
                      ) : (
                        <span className="text-amber-700">Pending</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setFindingsModal({
                              patient,
                              item,
                              findings: item.findings,
                              status: item.status,
                            })
                          }
                          className="rounded border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Update Findings
                        </button>
                        <button
                          type="button"
                          onClick={() => onPrintReceipt(patient)}
                          className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          <Printer className="w-3 h-3 text-[#128041]" />
                          <span>Receipt</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onPrintTestReport(patient)}
                          className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#1E2B4D] hover:bg-slate-50 cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Report</span>
                        </button>
                        {item.status === 'Completed' &&
                          (() => {
                            const link = buildWhatsAppReportReadyLink(patient, [item.title], db.settings);
                            return link ? (
                              <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                                title="Tell the patient on WhatsApp that this report is ready"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>Report ready</span>
                              </a>
                            ) : null;
                          })()}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Findings Update Modal */}
      {findingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  {findingsModal.item.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {findingsModal.patient.usgNo} · {findingsModal.patient.title}{' '}
                  {findingsModal.patient.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFindingsModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Test Status</label>
              <select
                value={findingsModal.status}
                onChange={(e) =>
                  setFindingsModal({
                    ...findingsModal,
                    status: e.target.value as 'Pending' | 'Completed',
                  })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clinical Impression / Findings
              </label>
              <textarea
                rows={4}
                value={findingsModal.findings}
                onChange={(e) =>
                  setFindingsModal({ ...findingsModal, findings: e.target.value })
                }
                placeholder="Enter ultrasound or X-ray findings..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#1E2B4D] focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFindingsModal(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateTestItem(
                    findingsModal.patient.id,
                    findingsModal.item.id,
                    findingsModal.status,
                    findingsModal.findings
                  );
                  setFindingsModal(null);
                }}
                className="rounded-lg bg-[#1E2B4D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#142036] cursor-pointer"
              >
                Save Findings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Info, X, AlertCircle } from 'lucide-react';
import type {
  ActivityEntry,
  AshaWorker,
  ClinicDatabase,
  ClinicSettings,
  Doctor,
  EmployeeAccount,
  ExpenseEntry,
  LabTest,
  NavRoute,
  PatientBill,
  PaymentEntry,
  PrintDocument,
  PrinterMode,
  ToastMessage,
} from './types/clinic';
import {
  clearSavedFolderHandle,
  loadClinicDatabase,
  loadSavedFolderHandle,
  saveClinicDatabase,
  saveFolderHandle,
} from './services/storage';
import {
  downloadDatabaseBundle,
  mergeDatabases,
  parseImportedDatabaseFile,
  pickSyncFolder,
  readDatabaseFromFolder,
  verifyFolderPermission,
  writeDailyBackupToFolder,
  writeDatabaseToFolder,
} from './services/folderSync';
import { computePaymentSummary } from './utils/calculations';
import { canViewRoute, roleLabel } from './utils/roles';
import { clearSession, hashPassword, readSession, verifyPassword, writeSession } from './services/auth';
import { printPatientReceipt } from './utils/printDocument';
import { getLocalDateISO } from './data/seedData';
import { LoginView } from './components/LoginView';
import { LayoutShell } from './components/LayoutShell';
import { DashboardView } from './components/DashboardView';
import { DoctorAshaModule } from './components/DoctorAshaModule';
import { LabTestModule } from './components/LabTestModule';
import { PatientModule } from './components/PatientModule';
import { ReportModule } from './components/ReportModule';
import { EmployeeModule } from './components/EmployeeModule';
import { SettingsView } from './components/SettingsView';
import { PrintModal } from './components/PrintModal';
import { FolderSyncModal } from './components/FolderSyncModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { ActivityLogView } from './components/ActivityLogView';


export default function App() {
  const [db, setDb] = useState<ClinicDatabase | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => readSession());
  const [activeRoute, setActiveRoute] = useState<NavRoute>('dashboard');
  const [editingPatient, setEditingPatient] = useState<PatientBill | null>(null);
  const [printDoc, setPrintDoc] = useState<PrintDocument | null>(null);
  const [folderSyncOpen, setFolderSyncOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);

  // Local Folder Sync state
  const folderHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const savedHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const [folderConnected, setFolderConnected] = useState(false);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [hasSavedFolderToResume, setHasSavedFolderToResume] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback((type: ToastMessage['type'], text: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  // Load initial database and check saved folder handle
  useEffect(() => {
    let mounted = true;
    (async () => {
      const loaded = await loadClinicDatabase();
      if (!mounted) return;
      setDb(loaded);

      const savedHandle = await loadSavedFolderHandle();
      if (!mounted || !savedHandle) return;

      savedHandleRef.current = savedHandle;
      setFolderName(savedHandle.name);

      try {
        const granted = await verifyFolderPermission(savedHandle, false);
        if (!mounted) return;
        if (granted) {
          folderHandleRef.current = savedHandle;
          setFolderConnected(true);
          // Silently check for newer data in the folder
          const incoming = await readDatabaseFromFolder(savedHandle);
          if (incoming && mounted) {
            const summary = mergeDatabases(loaded, incoming);
            await saveClinicDatabase(summary.merged);
            await writeDatabaseToFolder(savedHandle, summary.merged);
            setDb(summary.merged);
          }
        } else {
          setHasSavedFolderToResume(true);
        }
      } catch {
        setHasSavedFolderToResume(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Who is signed in, for the activity log (kept in a ref so commitDb stays stable)
  const currentUserRef = useRef<EmployeeAccount | null>(null);

  // Central persistence updater: writes IndexedDB + linked PC folder automatically
  const commitDb = useCallback(
    (updater: (prev: ClinicDatabase) => ClinicDatabase, log?: { action: string; detail: string }) => {
      setDb((prev) => {
        if (!prev) return prev;
        let next = updater(prev);
        const actor = currentUserRef.current;
        if (log && actor) {
          const at = new Date().toISOString();
          const entry: ActivityEntry = {
            id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            at,
            userName: actor.name,
            role: actor.role,
            action: log.action,
            detail: log.detail,
            updatedAt: at,
          };
          next = { ...next, activityLog: [entry, ...(next.activityLog || [])].slice(0, 3000) };
        }
        void (async () => {
          await saveClinicDatabase(next);
          if (folderHandleRef.current) {
            try {
              await writeDatabaseToFolder(folderHandleRef.current, next);
            } catch {
              // Permission may have expired; user can resume from header
            }
          }
        })();
        return next;
      });
    },
    []
  );

  // Sync helper: pull from folder, merge with local DB, write merged result back
  const syncWithHandle = useCallback(
    async (handle: FileSystemDirectoryHandle, currentDb: ClinicDatabase) => {
      setSyncBusy(true);
      setSyncNotice(null);
      try {
        const incoming = await readDatabaseFromFolder(handle);
        const nowIso = new Date().toISOString();

        if (incoming) {
          const summary = mergeDatabases(currentDb, incoming);
          const updatedDb: ClinicDatabase = {
            ...summary.merged,
            settings: {
              ...summary.merged.settings,
              linkedFolderName: handle.name,
              lastSyncedAt: nowIso,
            },
          };
          await saveClinicDatabase(updatedDb);
          await writeDatabaseToFolder(handle, updatedDb);
          setDb(updatedDb);

          const addedCount =
            summary.addedPatients +
            summary.addedDoctors +
            summary.addedAshas +
            summary.addedTests +
            summary.addedExpenses +
            summary.addedEmployees;

          const msg =
            addedCount > 0
              ? `Synced "${handle.name}" — fetched ${summary.addedPatients} patient(s), ${summary.addedDoctors} doctor(s), ${summary.addedTests} test(s), and ${summary.addedExpenses} expense(s).`
              : `Folder "${handle.name}" synced cleanly. All records are up to date.`;
          setSyncNotice(msg);
          pushToast('success', msg);
        } else {
          const updatedDb: ClinicDatabase = {
            ...currentDb,
            settings: {
              ...currentDb.settings,
              linkedFolderName: handle.name,
              lastSyncedAt: nowIso,
            },
          };
          await saveClinicDatabase(updatedDb);
          await writeDatabaseToFolder(handle, updatedDb);
          setDb(updatedDb);
          const msg = `Linked "${handle.name}" and saved sigma-usg-db.json. Copy this folder to another PC anytime to transfer & sync data.`;
          setSyncNotice(msg);
          pushToast('success', msg);
        }
      } catch (err) {
        const text =
          err instanceof Error
            ? err.message
            : 'Unable to write to the selected folder. Try Portable Sync File export instead.';
        setSyncNotice(text);
        pushToast('error', text);
      } finally {
        setSyncBusy(false);
      }
    },
    [pushToast]
  );

  const handleConnectFolder = async () => {
    if (!db) return;
    try {
      const handle = await pickSyncFolder();
      const granted = await verifyFolderPermission(handle, true);
      if (!granted) {
        pushToast('error', 'Folder read/write permission was not granted.');
        return;
      }
      folderHandleRef.current = handle;
      savedHandleRef.current = handle;
      await saveFolderHandle(handle);
      setFolderConnected(true);
      setFolderName(handle.name);
      setHasSavedFolderToResume(false);
      await syncWithHandle(handle, db);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg =
        'Direct folder access is blocked in embedded preview frames. Install as Desktop PWA in Chrome/Edge, or use Export / Import Sync File below.';
      setSyncNotice(msg);
      pushToast('info', msg);
    }
  };

  const handleResumeFolder = async () => {
    if (!db || !savedHandleRef.current) return;
    try {
      const granted = await verifyFolderPermission(savedHandleRef.current, true);
      if (granted) {
        folderHandleRef.current = savedHandleRef.current;
        setFolderConnected(true);
        setHasSavedFolderToResume(false);
        await syncWithHandle(savedHandleRef.current, db);
      } else {
        pushToast('error', 'Permission denied. Please connect the folder again.');
      }
    } catch {
      pushToast('error', 'Could not resume folder. Please select the folder again.');
    }
  };

  const handleSyncNow = async () => {
    if (!db || !folderHandleRef.current) return;
    await syncWithHandle(folderHandleRef.current, db);
  };

  const handleDisconnectFolder = async () => {
    folderHandleRef.current = null;
    savedHandleRef.current = null;
    await clearSavedFolderHandle();
    setFolderConnected(false);
    setFolderName(null);
    setHasSavedFolderToResume(false);
    setSyncNotice('Folder unlinked. Local IndexedDB storage remains active on this PC.');
    commitDb((prev) => ({
      ...prev,
      settings: { ...prev.settings, linkedFolderName: null },
    }));
  };

  const handleExportBundle = () => {
    if (!db) return;
    downloadDatabaseBundle(db);
    pushToast('success', 'Downloaded sigma-usg-db.json — copy it to another PC to sync.');
  };

  const handleImportBundle = async (file: File) => {
    if (!db) return;
    // Imports can add or overwrite staff accounts, so only an Admin may import.
    const importer = currentUserId ? db.employees.find((e) => e.id === currentUserId) : null;
    if (!importer || importer.role !== 'Admin') {
      pushToast('error', 'Only an Admin can import a database file.');
      return;
    }
    try {
      const incoming = await parseImportedDatabaseFile(file);
      const summary = mergeDatabases(db, incoming);
      await saveClinicDatabase(summary.merged);
      if (folderHandleRef.current) {
        try {
          await writeDatabaseToFolder(folderHandleRef.current, summary.merged);
        } catch {
          // Ignore folder write error
        }
      }
      setDb(summary.merged);
      const msg = `Imported & merged "${file.name}" (+${summary.addedPatients} patients, +${summary.addedDoctors} doctors, +${summary.addedTests} tests).`;
      setSyncNotice(msg);
      pushToast('success', msg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to parse sync file.';
      setSyncNotice(msg);
      pushToast('error', msg);
    }
  };

  // Automatic daily backup: once a folder is linked, the first save of each day
  // also writes a dated copy into <folder>/backups/.
  const lastBackupDay = db?.settings.lastBackupAt ? getLocalDateISO(new Date(db.settings.lastBackupAt)) : null;
  const hasRecords = Boolean(db && (db.patients.length || db.expenses.length));
  useEffect(() => {
    if (!db || !folderConnected || !folderHandleRef.current || !hasRecords) return;
    const todayIso = getLocalDateISO();
    if (lastBackupDay === todayIso) return;
    let cancelled = false;
    (async () => {
      try {
        const path = await writeDailyBackupToFolder(folderHandleRef.current!, db, todayIso);
        if (!cancelled) markBackedUp(`Automatic daily backup: ${path}`);
      } catch {
        // Folder permission lost; the reminder banner stays visible
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderConnected, lastBackupDay, hasRecords]);

  const handleSaveDailySnapshot = async (dateStr: string) => {
    if (!db) return;
    if (folderHandleRef.current) {
      try {
        const path = await writeDailyBackupToFolder(folderHandleRef.current, db, dateStr);
        markBackedUp(`Saved to folder ${folderName}/${path}`);
        pushToast('success', `Backup saved to ${folderName}/${path}`);
        return;
      } catch {
        // Fallback to download
      }
    }
    downloadDatabaseBundle(db, `Sigma-EOD-Backup-${dateStr}.json`);
    markBackedUp(`Downloaded Sigma-EOD-Backup-${dateStr}.json`);
    pushToast('success', `Backup downloaded: Sigma-EOD-Backup-${dateStr}.json. Keep it in a safe folder or pen drive.`);
  };

  const markBackedUp = (detail: string) => {
    const at = new Date().toISOString();
    commitDb((prev) => ({ ...prev, settings: { ...prev.settings, lastBackupAt: at } }), {
      action: 'Backup saved',
      detail,
    });
  };

  if (!db) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F4F0] text-sm text-slate-600">
        Loading Sigma Diagnostic and USG Center...
      </div>
    );
  }

  const currentUser = currentUserId
    ? db.employees.find((e) => e.id === currentUserId) || null
    : null;
  currentUserRef.current = currentUser;

  const handleLogin = (account: EmployeeAccount) => {
    setCurrentUserId(account.id);
    writeSession(account.id);
    currentUserRef.current = account;
    commitDb((prev) => prev, { action: 'Signed in', detail: roleLabel(account.role) });
    setActiveRoute('dashboard');
    pushToast('success', `Welcome back, ${account.name} (${roleLabel(account.role)}).`);
  };

  const handleLogout = () => {
    commitDb((prev) => prev, { action: 'Signed out', detail: '' });
    setCurrentUserId(null);
    setEditingPatient(null);
    clearSession();
  };

  if (!currentUser) {
    return (
      <LoginView
        settings={db.settings}
        employees={db.employees}
        onLogin={handleLogin}
      />
    );
  }

  const isAdmin = currentUser.role === 'Admin';
  const today = getLocalDateISO();

  // --- CRUD HANDLERS WITH RBAC ENFORCEMENT ---
  const handleSaveDoctor = (doc: Doctor, isEdit: boolean) => {
    commitDb((prev) => ({
      ...prev,
      doctors: isEdit
        ? prev.doctors.map((d) => (d.id === doc.id ? doc : d))
        : [...prev.doctors, doc],
    }), { action: isEdit ? 'Doctor edited' : 'Doctor added', detail: doc.name });
    pushToast('success', isEdit ? `Updated doctor ${doc.name}.` : `Added doctor ${doc.name}.`);
  };

  const handleDeleteDoctor = (id: string) => {
    if (!isAdmin) return;
    commitDb((prev) => ({ ...prev, doctors: prev.doctors.filter((d) => d.id !== id) }), { action: 'Doctor deleted', detail: db.doctors.find((d) => d.id === id)?.name || id });
    pushToast('info', 'Doctor removed.');
  };

  const handleSaveAsha = (asha: AshaWorker, isEdit: boolean) => {
    commitDb((prev) => ({
      ...prev,
      ashas: isEdit
        ? prev.ashas.map((a) => (a.id === asha.id ? asha : a))
        : [...prev.ashas, asha],
    }), { action: isEdit ? 'Asha edited' : 'Asha added', detail: asha.name });
    pushToast('success', isEdit ? `Updated Asha ${asha.name}.` : `Added Asha ${asha.name}.`);
  };

  const handleDeleteAsha = (id: string) => {
    if (!isAdmin) return;
    commitDb((prev) => ({ ...prev, ashas: prev.ashas.filter((a) => a.id !== id) }), { action: 'Asha deleted', detail: db.ashas.find((a) => a.id === id)?.name || id });
    pushToast('info', 'Asha record removed.');
  };

  const handleSaveTest = (test: LabTest, isEdit: boolean) => {
    commitDb((prev) => ({
      ...prev,
      labTests: isEdit
        ? prev.labTests.map((t) => (t.id === test.id ? test : t))
        : [test, ...prev.labTests],
    }), { action: isEdit ? 'Test rate edited' : 'Test added', detail: `${test.title} ₹${test.amount}` });
    pushToast('success', isEdit ? `Updated test ${test.title}.` : `Added test ${test.title}.`);
  };

  const handleDeleteTest = (id: string) => {
    if (!isAdmin) return;
    commitDb((prev) => ({ ...prev, labTests: prev.labTests.filter((t) => t.id !== id) }), { action: 'Test deleted', detail: db.labTests.find((t) => t.id === id)?.title || id });
    pushToast('info', 'Test deleted from USG Master.');
  };

  const handleSavePatient = (patient: PatientBill, isEdit: boolean, openPrintAfter: boolean) => {
    if (isEdit && !isAdmin && patient.date !== today) {
      pushToast('error', 'Users cannot edit previous-date bills.');
      return;
    }

    commitDb((prev) => ({
      ...prev,
      patients: isEdit
        ? prev.patients.map((p) => (p.id === patient.id ? patient : p))
        : [patient, ...prev.patients],
      settings: isEdit
        ? prev.settings
        : {
            ...prev.settings,
            nextRegNumber: prev.settings.nextRegNumber + 1,
            updatedAt: new Date().toISOString(),
          },
    }), { action: isEdit ? 'Bill edited' : 'Bill created', detail: `${patient.usgNo} ${patient.name} · net ₹${patient.netAmount}, paid ₹${patient.paidAmount}` });

    pushToast(
      'success',
      isEdit ? `Updated bill ${patient.usgNo}.` : `Saved patient bill ${patient.usgNo}.`
    );
    if (openPrintAfter) {
      setPrintDoc({ kind: 'receipt', patient });
      printPatientReceipt(patient, db, db.settings.defaultPrinterMode);
    }
  };

  const handleCollectDue = (patientId: string, newPayments: PaymentEntry[]) => {
    let updatedTarget: PatientBill | null = null;
    commitDb((prev) => ({
      ...prev,
      patients: prev.patients.map((p) => {
        if (p.id !== patientId) return p;
        const allPayments = [...p.payments, ...newPayments];
        const summary = computePaymentSummary(allPayments);
        const totalPaid = summary.cash + summary.upi + summary.card;
        const balance = Math.max(0, p.netAmount - totalPaid);
        updatedTarget = {
          ...p,
          payments: allPayments,
          paymentSummary: summary,
          paidAmount: totalPaid,
          balance,
          updatedAt: new Date().toISOString(),
        };
        return updatedTarget;
      }),
    }), { action: 'Due collected', detail: `${db.patients.find((p) => p.id === patientId)?.usgNo || ''} ₹${newPayments.reduce((s, x) => s + x.amount, 0)}` });
    pushToast('success', 'Balance due collection recorded and added to today’s EOD summary.');
    if (updatedTarget) {
      setPrintDoc({ kind: 'receipt', patient: updatedTarget });
    }
  };

  const handleUpdateTestItem = (
    patientId: string,
    itemId: string,
    status: 'Pending' | 'Completed',
    findings: string
  ) => {
    commitDb((prev) => ({
      ...prev,
      patients: prev.patients.map((p) => {
        if (p.id !== patientId) return p;
        return {
          ...p,
          items: p.items.map((it) => (it.id === itemId ? { ...it, status, findings } : it)),
          updatedAt: new Date().toISOString(),
        };
      }),
    }), { action: status === 'Completed' ? 'Report completed' : 'Report reopened', detail: `${db.patients.find((p) => p.id === patientId)?.usgNo || ''} ${db.patients.find((p) => p.id === patientId)?.items.find((i) => i.id === itemId)?.title || ''}` });
    pushToast('success', 'Test findings updated.');
  };

  const handleDeletePatient = (patientId: string) => {
    if (!isAdmin) {
      pushToast('error', 'Only Admins can delete patient bills.');
      return;
    }
    commitDb((prev) => ({
      ...prev,
      patients: prev.patients.filter((p) => p.id !== patientId),
    }), { action: 'Bill deleted', detail: (() => { const b = db.patients.find((p) => p.id === patientId); return b ? `${b.usgNo} ${b.name} · ₹${b.netAmount}` : patientId; })() });
    pushToast('info', 'Patient bill deleted.');
  };

  const handleAddExpense = (entry: ExpenseEntry) => {
    commitDb((prev) => ({ ...prev, expenses: [entry, ...prev.expenses] }), { action: 'Expense added', detail: `${entry.type} ${entry.particular} ₹${entry.amount}` });
    pushToast('success', `Recorded ${entry.type} entry: ${entry.particular}.`);
  };

  const handleDeleteExpense = (id: string) => {
    if (!isAdmin) return;
    commitDb((prev) => ({ ...prev, expenses: prev.expenses.filter((e) => e.id !== id) }), { action: 'Expense deleted', detail: (() => { const x = db.expenses.find((e) => e.id === id); return x ? `${x.type} ${x.particular} ₹${x.amount}` : id; })() });
    pushToast('info', 'Expense entry deleted.');
  };

  const handleSaveEmployee = async (emp: EmployeeAccount, isEdit: boolean) => {
    if (!isAdmin) return;
    // A blank password on edit keeps the existing (hashed) password.
    const existing = isEdit ? db.employees.find((e) => e.id === emp.id) : undefined;
    const password = emp.password
      ? await hashPassword(emp.password)
      : existing?.password ?? '';
    if (!password) return;
    const secured: EmployeeAccount = { ...emp, password };
    commitDb((prev) => ({
      ...prev,
      employees: isEdit
        ? prev.employees.map((e) => (e.id === secured.id ? secured : e))
        : [...prev.employees, secured],
    }), { action: isEdit ? 'Staff account edited' : 'Staff account created', detail: `${secured.name} (${roleLabel(secured.role)})${emp.password ? ', password set' : ''}` });
    pushToast('success', isEdit ? `Updated staff ${emp.name}.` : `Created account for ${emp.name}.`);
  };

  const handleDeleteEmployee = (id: string) => {
    if (!isAdmin || id === currentUser.id) return;
    commitDb((prev) => ({ ...prev, employees: prev.employees.filter((e) => e.id !== id) }), { action: 'Staff account deleted', detail: db.employees.find((e) => e.id === id)?.name || id });
    pushToast('info', 'Staff account removed.');
  };

  const handleChangeOwnPassword = async (current: string, next: string): Promise<string | null> => {
    const me = db.employees.find((e) => e.id === currentUser.id);
    if (!me) return 'Account not found. Sign in again.';
    if (!(await verifyPassword(current, me.password))) return 'Current password is wrong.';
    const hashed = await hashPassword(next);
    commitDb(
      (prev) => ({
        ...prev,
        employees: prev.employees.map((e) =>
          e.id === me.id ? { ...e, password: hashed, updatedAt: new Date().toISOString() } : e
        ),
      }),
      { action: 'Password changed', detail: `${me.name} changed their own password` }
    );
    pushToast('success', 'Password changed. Use the new password next time you sign in.');
    return null;
  };

  const handleSaveSettings = (updated: ClinicSettings) => {
    if (!isAdmin) return;
    commitDb((prev) => ({ ...prev, settings: updated }), { action: 'Settings changed', detail: 'Clinic settings updated' });
    pushToast('success', 'Clinic settings saved.');
  };

  const handleChangeDefaultPrinterMode = (mode: PrinterMode) => {
    commitDb((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        defaultPrinterMode: mode,
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  const renderMainView = () => {
    if (!canViewRoute(currentUser.role, activeRoute)) {
      return (
        <div className="mx-auto my-10 max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-2xl">🔒</div>
          <h2 className="mt-4 font-display text-lg font-bold text-slate-900">Admin access required</h2>
          <p className="mt-1.5 text-sm text-slate-600">
            Summaries and reports are only available to the Admin login.
          </p>
          <button
            type="button"
            onClick={() => setActiveRoute('dashboard')}
            className="mt-5 rounded-lg bg-[#1E2B4D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#142036] cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      );
    }
    switch (activeRoute) {
      case 'activity-log':
        return <ActivityLogView entries={db.activityLog || []} />;
      case 'dashboard':
        return (
          <DashboardView
            db={db}
            currentUser={currentUser}
            onNavigate={setActiveRoute}
            onPrintReceipt={(patient) => setPrintDoc({ kind: 'receipt', patient })}
            onOpenFolderSync={() => setFolderSyncOpen(true)}
          />
        );
      case 'doctor-add':
      case 'doctor-view':
        return (
          <DoctorAshaModule
            entityType="doctor"
            mode={activeRoute === 'doctor-add' ? 'add' : 'view'}
            items={db.doctors}
            userRole={currentUser.role}
            onSave={handleSaveDoctor}
            onDelete={handleDeleteDoctor}
            onSwitchMode={(m) => setActiveRoute(m === 'add' ? 'doctor-add' : 'doctor-view')}
          />
        );
      case 'asha-add':
      case 'asha-view':
        return (
          <DoctorAshaModule
            entityType="asha"
            mode={activeRoute === 'asha-add' ? 'add' : 'view'}
            items={db.ashas}
            userRole={currentUser.role}
            onSave={handleSaveAsha}
            onDelete={handleDeleteAsha}
            onSwitchMode={(m) => setActiveRoute(m === 'add' ? 'asha-add' : 'asha-view')}
          />
        );
      case 'patient-add':
      case 'patient-view':
      case 'patient-tests':
        return (
          <PatientModule
            subView={
              activeRoute === 'patient-add'
                ? 'add'
                : activeRoute === 'patient-view'
                  ? 'view'
                  : 'tests'
            }
            db={db}
            currentUser={currentUser}
            editingPatient={editingPatient}
            onClearEditing={() => setEditingPatient(null)}
            onStartEdit={(p) => {
              setEditingPatient(p);
              setActiveRoute('patient-add');
            }}
            onSavePatient={handleSavePatient}
            onCollectDue={handleCollectDue}
            onUpdateTestItem={handleUpdateTestItem}
            onDeletePatient={handleDeletePatient}
            onPrintReceipt={(patient) => setPrintDoc({ kind: 'receipt', patient })}
            onPrintTestReport={(patient) => setPrintDoc({ kind: 'test-report', patient })}
            onSwitchSubView={(v) =>
              setActiveRoute(
                v === 'add' ? 'patient-add' : v === 'view' ? 'patient-view' : 'patient-tests'
              )
            }
            onOpenLabMaster={() => setActiveRoute('lab-master')}
            onQuickAddLabTest={(test) => handleSaveTest(test, false)}
          />
        );
      case 'lab-master':
        return (
          <LabTestModule
            labTests={db.labTests}
            userRole={currentUser.role}
            onSaveTest={handleSaveTest}
            onDeleteTest={handleDeleteTest}
          />
        );
      case 'report-eod':
      case 'report-expense-add':
      case 'report-expense-view':
      case 'report-doctor':
      case 'report-dc':
      case 'report-progress': {
        const subMap = {
          'report-eod': 'eod',
          'report-expense-add': 'expense-add',
          'report-expense-view': 'expense-view',
          'report-doctor': 'doctor',
          'report-dc': 'dc',
          'report-progress': 'progress',
        } as const;
        return (
          <ReportModule
            subView={subMap[activeRoute]}
            db={db}
            currentUser={currentUser}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            onPrintEod={(date) => setPrintDoc({ kind: 'eod', date })}
            onSaveDailySnapshot={handleSaveDailySnapshot}
            onSwitchSubView={(v) => {
              const rev: Record<typeof v, NavRoute> = {
                eod: 'report-eod',
                'expense-add': 'report-expense-add',
                'expense-view': 'report-expense-view',
                doctor: 'report-doctor',
                dc: 'report-dc',
                progress: 'report-progress',
              };
              setActiveRoute(rev[v]);
            }}
          />
        );
      }
      case 'employee-view':
      case 'employee-account':
        return (
          <EmployeeModule
            subView={activeRoute === 'employee-view' ? 'emp' : 'account'}
            employees={db.employees}
            currentUser={currentUser}
            onSaveEmployee={handleSaveEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onSwitchSubView={(v) =>
              setActiveRoute(v === 'emp' ? 'employee-view' : 'employee-account')
            }
          />
        );
      case 'settings':
        return (
          <SettingsView
            settings={db.settings}
            userRole={currentUser.role}
            onSaveSettings={handleSaveSettings}
            onOpenFolderSync={() => setFolderSyncOpen(true)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <LayoutShell
        activeRoute={activeRoute}
        onNavigate={(route) => {
          if (route !== 'patient-add') setEditingPatient(null);
          setActiveRoute(route);
        }}
        currentUser={currentUser}
        settings={db.settings}
        folderConnected={folderConnected}
        folderName={folderName}
        hasSavedFolderToResume={hasSavedFolderToResume}
        onOpenFolderSync={() => setFolderSyncOpen(true)}
        onResumeFolder={handleResumeFolder}
        onLogout={handleLogout}
        onChangePassword={() => setChangePwOpen(true)}
        backupDue={
          isAdmin &&
          (db.patients.length > 0 || db.expenses.length > 0) &&
          (!db.settings.lastBackupAt || getLocalDateISO(new Date(db.settings.lastBackupAt)) !== today)
        }
        lastBackupAt={db.settings.lastBackupAt ?? null}
        onBackupNow={() => handleSaveDailySnapshot(today)}
      >
        {renderMainView()}
      </LayoutShell>

      {/* Adaptive POS / A4 Print Modal & Hidden Print Portal */}
      <PrintModal
        doc={printDoc}
        db={db}
        isAdmin={isAdmin}
        defaultPrinterMode={db.settings.defaultPrinterMode}
        onChangeDefaultPrinterMode={handleChangeDefaultPrinterMode}
        onClose={() => setPrintDoc(null)}
      />

      <ChangePasswordModal
        open={changePwOpen}
        onClose={() => setChangePwOpen(false)}
        onSubmit={handleChangeOwnPassword}
      />

      {/* Local PC Folder Sync & Portable Transfer Modal */}
      <FolderSyncModal
        open={folderSyncOpen}
        db={db}
        folderConnected={folderConnected}
        folderName={folderName}
        hasSavedFolderToResume={hasSavedFolderToResume}
        syncBusy={syncBusy}
        syncNotice={syncNotice}
        onConnectFolder={handleConnectFolder}
        onResumeFolder={handleResumeFolder}
        onSyncNow={handleSyncNow}
        onDisconnectFolder={handleDisconnectFolder}
        onExportBundle={handleExportBundle}
        onImportBundle={handleImportBundle}
        onClose={() => setFolderSyncOpen(false)}
      />

      {/* Toast Stack */}
      {toasts.length > 0 && (
        <div className="no-print fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs font-medium shadow-lg bg-white ${
                t.type === 'success'
                  ? 'border-emerald-200 text-emerald-900'
                  : t.type === 'error'
                    ? 'border-red-200 text-red-900'
                    : 'border-slate-200 text-slate-800'
              }`}
            >
              {t.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : t.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-[#1E2B4D] shrink-0 mt-0.5" />
              )}
              <span className="flex-1 leading-snug">{t.text}</span>
              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

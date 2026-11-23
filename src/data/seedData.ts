import type { ClinicDatabase, EmployeeAccount } from '../types/clinic';

export function getLocalDateISO(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function createSeedDatabase(): ClinicDatabase {
  const nowIso = new Date().toISOString();

  // Only the default Admin login account is initialized so you can sign in on first launch.
  // All doctors, Asha workers, tests, patients, expenses, and staff accounts start completely empty.
  const employees: EmployeeAccount[] = [
    {
      id: 'emp-admin',
      name: 'Admin',
      empNo: '1',
      contactNo: '',
      emailOrUsername: 'Sigmaadmin',
      password: 'sigma1420',
      role: 'Admin',
      updatedAt: nowIso,
    },
  ];

  return {
    schemaVersion: 2,
    exportedAt: nowIso,
    doctors: [],
    ashas: [],
    labTests: [],
    patients: [],
    expenses: [],
    employees,
    settings: {
      centerName: 'Sigma Diagnostic and USG Center',
      tagline: '',
      address: '',
      phone: '',
      centers: ['HEAD OFFICE'],
      regPrefix: 'SIG',
      nextRegNumber: 1,
      defaultPrinterMode: 'auto',
      lastSyncedAt: null,
      linkedFolderName: null,
      updatedAt: nowIso,
    },
  };
}

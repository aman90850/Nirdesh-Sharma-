import type { ClinicDatabase, EmployeeAccount } from '../types/clinic';
import {
  DEFAULT_ADMIN_PASSWORD_HASH,
  DEFAULT_ADMIN_USERNAME,
  ensureDefaultUserAccount,
} from '../services/auth';

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
      emailOrUsername: DEFAULT_ADMIN_USERNAME,
      // Stored as a salted hash only; the plain password is never in the code.
      password: DEFAULT_ADMIN_PASSWORD_HASH,
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
    employees: ensureDefaultUserAccount(employees) ?? employees,
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

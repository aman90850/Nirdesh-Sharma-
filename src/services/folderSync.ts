import type { ClinicDatabase } from '../types/clinic';

export const SYNC_FILENAME = 'sigma-usg-db.json';

interface RecordWithTimestamp {
  id: string;
  updatedAt?: string;
}

function mergeCollection<T extends RecordWithTimestamp>(localList: T[], incomingList: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of localList) {
    map.set(item.id, item);
  }
  for (const incoming of incomingList) {
    const existing = map.get(incoming.id);
    if (!existing) {
      map.set(incoming.id, incoming);
    } else {
      const existingTime = existing.updatedAt ? Date.parse(existing.updatedAt) : 0;
      const incomingTime = incoming.updatedAt ? Date.parse(incoming.updatedAt) : 0;
      if (incomingTime >= existingTime) {
        map.set(incoming.id, incoming);
      }
    }
  }
  return Array.from(map.values());
}

export interface MergeSummary {
  merged: ClinicDatabase;
  addedPatients: number;
  addedDoctors: number;
  addedAshas: number;
  addedTests: number;
  addedExpenses: number;
  addedEmployees: number;
}

export function mergeDatabases(localDb: ClinicDatabase, incomingDb: ClinicDatabase): MergeSummary {
  const doctors = mergeCollection(localDb.doctors, incomingDb.doctors || []);
  const ashas = mergeCollection(localDb.ashas, incomingDb.ashas || []);
  const labTests = mergeCollection(localDb.labTests, incomingDb.labTests || []);
  const patients = mergeCollection(localDb.patients, incomingDb.patients || []);
  const expenses = mergeCollection(localDb.expenses, incomingDb.expenses || []);
  const employees = mergeCollection(localDb.employees, incomingDb.employees || []);

  const localSettingsTime = localDb.settings.updatedAt ? Date.parse(localDb.settings.updatedAt) : 0;
  const incomingSettingsTime = incomingDb.settings?.updatedAt
    ? Date.parse(incomingDb.settings.updatedAt)
    : 0;
  const baseSettings =
    incomingDb.settings && incomingSettingsTime > localSettingsTime
      ? incomingDb.settings
      : localDb.settings;

  const nextRegNumber = Math.max(
    localDb.settings.nextRegNumber || 1,
    incomingDb.settings?.nextRegNumber || 1
  );

  const nowIso = new Date().toISOString();

  const merged: ClinicDatabase = {
    schemaVersion: Math.max(localDb.schemaVersion || 1, incomingDb.schemaVersion || 1),
    exportedAt: nowIso,
    doctors,
    ashas,
    labTests,
    patients,
    expenses,
    employees,
    settings: {
      ...baseSettings,
      nextRegNumber,
      lastSyncedAt: nowIso,
      linkedFolderName: localDb.settings.linkedFolderName ?? baseSettings.linkedFolderName ?? null,
    },
  };

  return {
    merged,
    addedPatients: Math.max(0, patients.length - localDb.patients.length),
    addedDoctors: Math.max(0, doctors.length - localDb.doctors.length),
    addedAshas: Math.max(0, ashas.length - localDb.ashas.length),
    addedTests: Math.max(0, labTests.length - localDb.labTests.length),
    addedExpenses: Math.max(0, expenses.length - localDb.expenses.length),
    addedEmployees: Math.max(0, employees.length - localDb.employees.length),
  };
}

export function isFolderPickerSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export async function verifyFolderPermission(
  handle: FileSystemDirectoryHandle,
  requestIfNeeded: boolean
): Promise<boolean> {
  const permHandle = handle as FileSystemDirectoryHandle & {
    queryPermission?: (desc: { mode: 'readwrite' }) => Promise<PermissionState>;
    requestPermission?: (desc: { mode: 'readwrite' }) => Promise<PermissionState>;
  };

  if (permHandle.queryPermission) {
    const current = await permHandle.queryPermission({ mode: 'readwrite' });
    if (current === 'granted') return true;
  }
  if (requestIfNeeded && permHandle.requestPermission) {
    const res = await permHandle.requestPermission({ mode: 'readwrite' });
    return res === 'granted';
  }
  return false;
}

export async function pickSyncFolder(): Promise<FileSystemDirectoryHandle> {
  const picker = (
    window as unknown as {
      showDirectoryPicker: (options?: {
        id?: string;
        mode?: 'readwrite';
        startIn?: string;
      }) => Promise<FileSystemDirectoryHandle>;
    }
  ).showDirectoryPicker;

  return picker({
    id: 'sigma-usg-sync-folder',
    mode: 'readwrite',
    startIn: 'documents',
  });
}

export async function readDatabaseFromFolder(
  handle: FileSystemDirectoryHandle
): Promise<ClinicDatabase | null> {
  try {
    const fileHandle = await handle.getFileHandle(SYNC_FILENAME, { create: false });
    const file = await fileHandle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text) as ClinicDatabase;
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.patients)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function writeDatabaseToFolder(
  handle: FileSystemDirectoryHandle,
  db: ClinicDatabase
): Promise<void> {
  const fileHandle = await handle.getFileHandle(SYNC_FILENAME, { create: true });
  const writable = await fileHandle.createWritable();
  const payload: ClinicDatabase = {
    ...db,
    exportedAt: new Date().toISOString(),
  };
  await writable.write(JSON.stringify(payload, null, 2));
  await writable.close();
}

export async function writeDailyBackupToFolder(
  handle: FileSystemDirectoryHandle,
  db: ClinicDatabase,
  dateStr: string
): Promise<string> {
  const backupDir = await handle.getDirectoryHandle('backups', { create: true });
  const filename = `EOD-${dateStr}.json`;
  const fileHandle = await backupDir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(
    JSON.stringify(
      {
        ...db,
        backupDate: dateStr,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
  await writable.close();
  return `backups/${filename}`;
}

export function downloadDatabaseBundle(db: ClinicDatabase, customFilename?: string): void {
  const payload: ClinicDatabase = {
    ...db,
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = customFilename || SYNC_FILENAME;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function parseImportedDatabaseFile(file: File): Promise<ClinicDatabase> {
  const text = await file.text();
  const parsed = JSON.parse(text) as ClinicDatabase;
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.patients) || !Array.isArray(parsed.labTests)) {
    throw new Error('Selected file is not a valid Sigma USG database sync file.');
  }
  return parsed;
}

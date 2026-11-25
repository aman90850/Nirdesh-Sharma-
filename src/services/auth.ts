// Password hashing and login protection for staff accounts.
// Passwords are never stored in plain text: each one is saved as a salted
// PBKDF2-SHA256 hash in the form  pbkdf2$<iterations>$<saltB64>$<hashB64>.

import type { EmployeeAccount } from '../types/clinic';

const HASH_PREFIX = 'pbkdf2$';
const ITERATIONS = 210000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

export const MIN_PASSWORD_LENGTH = 8;

function toB64(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    KEY_BITS
  );
  return new Uint8Array(bits);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function isHashedPassword(stored: string | undefined | null): boolean {
  return typeof stored === 'string' && stored.startsWith(HASH_PREFIX);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, ITERATIONS);
  return `${HASH_PREFIX}${ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!isHashedPassword(stored)) {
    // Legacy plain-text value (e.g. from an old backup file). Compare, then caller upgrades it.
    const a = new TextEncoder().encode(password);
    const b = new TextEncoder().encode(stored ?? '');
    return constantTimeEqual(a, b);
  }
  const [, iterStr, saltB64, hashB64] = stored.split('$');
  const iterations = Number(iterStr);
  if (!iterations || !saltB64 || !hashB64) return false;
  const actual = await derive(password, fromB64(saltB64), iterations);
  return constantTimeEqual(actual, fromB64(hashB64));
}

// Default credentials that were published in the source code. Any account still
// using one of these is reset to the secure default admin credential on load.
const PUBLISHED_DEFAULT_PASSWORDS = ['sigma1420', 'Nirdesh@sigma'];

export const DEFAULT_ADMIN_USERNAME = 'sigma.admin';
// Hash of the default admin password (the password itself is NOT in the code).
export const DEFAULT_ADMIN_PASSWORD_HASH =
  'pbkdf2$210000$k22g4cdwc+0svwCI1/XeVA==$8BeTeJoIDMoWld2a9d0ulcclhcE58+uq8ilfT8U7wjU=';

export const DEFAULT_USER_ID = 'emp-user';
export const DEFAULT_USER_USERNAME = 'sigma.user';
// Hash of the default User (staff) password.
export const DEFAULT_USER_PASSWORD_HASH =
  'pbkdf2$210000$fgocvsA3aLfjE57oU0CGPQ==$g4dS4/P0r73S+wGRN7pX7YNKfP0/G4VgviPWI4cmTeo=';

/** Adds the default User (staff) login if this install does not have it yet. */
export function ensureDefaultUserAccount(employees: EmployeeAccount[]): EmployeeAccount[] | null {
  const exists = employees.some(
    (e) => e.id === DEFAULT_USER_ID || e.emailOrUsername.toLowerCase() === DEFAULT_USER_USERNAME
  );
  if (exists) return null;
  return [
    ...employees,
    {
      id: DEFAULT_USER_ID,
      name: 'Staff User',
      empNo: '2',
      contactNo: '',
      emailOrUsername: DEFAULT_USER_USERNAME,
      password: DEFAULT_USER_PASSWORD_HASH,
      role: 'Operator',
      updatedAt: new Date().toISOString(),
    },
  ];
}

// Earlier default hashes, replaced by the current defaults on load.
const SUPERSEDED_HASHES: Record<string, () => string> = {
  'pbkdf2$210000$6bEafKazu859KfpWV0nCqg==$b2ega5gVu5al5b8JNqlI1GHgCrjrcB69kMx65ofJJXM=': () => DEFAULT_ADMIN_PASSWORD_HASH,
  'pbkdf2$210000$KEQDF7flR0pHnZuvdv556w==$oDkEc9qq9GsxsHtgqW2MQaFb4ZT3+m39RIvG+Ww90k0=': () => DEFAULT_USER_PASSWORD_HASH,
};

/**
 * Upgrades every account so no plain-text password remains:
 *  - accounts still on a published default password get the new secure admin credential
 *  - any other plain-text password is hashed in place
 * Returns null when nothing changed.
 */
export async function secureEmployeeAccounts(
  employees: EmployeeAccount[]
): Promise<EmployeeAccount[] | null> {
  let changed = false;
  const nowIso = new Date().toISOString();
  const result: EmployeeAccount[] = [];
  for (const emp of employees) {
    const replacement = SUPERSEDED_HASHES[emp.password];
    if (replacement) {
      changed = true;
      result.push({ ...emp, password: replacement(), updatedAt: nowIso });
      continue;
    }
    if (isHashedPassword(emp.password)) {
      result.push(emp);
      continue;
    }
    changed = true;
    if (PUBLISHED_DEFAULT_PASSWORDS.includes(emp.password)) {
      result.push({
        ...emp,
        emailOrUsername: emp.role === 'Admin' ? DEFAULT_ADMIN_USERNAME : emp.emailOrUsername,
        password: DEFAULT_ADMIN_PASSWORD_HASH,
        updatedAt: nowIso,
      });
    } else {
      result.push({ ...emp, password: await hashPassword(emp.password), updatedAt: nowIso });
    }
  }
  return changed ? result : null;
}

// ---- Brute-force protection (per device) ----
const LOCK_KEY = 'sigma_usg_login_lock_v1';
const MAX_ATTEMPTS = 5;
const LOCK_MS = 60 * 1000;

interface LockState {
  failures: number;
  lockedUntil: number;
}

function readLock(): LockState {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (raw) return JSON.parse(raw) as LockState;
  } catch {
    // Ignore
  }
  return { failures: 0, lockedUntil: 0 };
}

function writeLock(state: LockState): void {
  try {
    localStorage.setItem(LOCK_KEY, JSON.stringify(state));
  } catch {
    // Ignore
  }
}

export function getLockRemainingSeconds(): number {
  const { lockedUntil } = readLock();
  return Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
}

export function recordFailedLogin(): void {
  const state = readLock();
  const failures = state.failures + 1;
  if (failures >= MAX_ATTEMPTS) {
    writeLock({ failures: 0, lockedUntil: Date.now() + LOCK_MS });
  } else {
    writeLock({ failures, lockedUntil: state.lockedUntil });
  }
}

export function clearFailedLogins(): void {
  writeLock({ failures: 0, lockedUntil: 0 });
}

// ---- Session with expiry ----
const SESSION_KEY = 'sigma_usg_session_v2';
const LEGACY_SESSION_KEY = 'sigma_usg_active_user_id_v1';
const SESSION_MS = 12 * 60 * 60 * 1000; // auto sign-out after 12 hours

export function readSession(): string | null {
  try {
    localStorage.removeItem(LEGACY_SESSION_KEY);
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { id, exp } = JSON.parse(raw) as { id: string; exp: number };
    if (!id || !exp || Date.now() > exp) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return id;
  } catch {
    return null;
  }
}

export function writeSession(id: string): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id, exp: Date.now() + SESSION_MS }));
  } catch {
    // Ignore
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore
  }
}

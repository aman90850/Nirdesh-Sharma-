export type Role = 'Admin' | 'Operator';
export type PaymentMode = 'Cash' | 'UPI' | 'Card';
export type TestParent = 'Ultrasound' | 'X-Ray';
export type TestType = 'S.T' | 'R.T';
export type ExpenseType = 'CR' | 'DR';
export type PrinterMode = 'auto' | 'pos' | 'a4';
export type TestItemStatus = 'Pending' | 'Completed';

export interface Doctor {
  id: string;
  name: string;
  phone: string;
  usgStPercent: number;
  usgRtPercent: number;
  address: string;
  updatedAt: string;
}

export interface AshaWorker {
  id: string;
  name: string;
  phone: string;
  usgStPercent: number;
  usgRtPercent: number;
  address: string;
  updatedAt: string;
}

export interface LabTest {
  id: string;
  title: string;
  amount: number;
  parent: TestParent;
  type: TestType;
  updatedAt: string;
}

export interface PatientTestItem {
  id: string;
  testId: string;
  title: string;
  parent: TestParent;
  type: TestType;
  rate: number;
  status: TestItemStatus;
  findings: string;
}

export interface PaymentEntry {
  id: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  amount: number;
  mode: PaymentMode;
  note: string;
  collectedBy: string;
}

export interface PaymentSummary {
  cash: number;
  upi: number;
  card: number;
}

export interface PatientBill {
  id: string;
  usgNo: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  title: string;
  name: string;
  gender: 'Male' | 'Female' | 'Other';
  ageValue: string;
  ageUnit: 'Year' | 'Month' | 'Day';
  phone: string;
  center: string;
  doctorId: string;
  ashaId: string;
  remarks: string;
  items: PatientTestItem[];
  totalAmount: number;
  discount: number;
  netAmount: number;
  paidAmount: number;
  balance: number;
  paymentSummary: PaymentSummary;
  payments: PaymentEntry[];
  createdBy: string;
  updatedAt: string;
}

export interface ExpenseEntry {
  id: string;
  date: string; // YYYY-MM-DD
  particular: string;
  description: string;
  type: ExpenseType;
  amount: number;
  createdBy: string;
  updatedAt: string;
}

export interface EmployeeAccount {
  id: string;
  name: string;
  empNo: string;
  contactNo: string;
  emailOrUsername: string;
  password: string;
  role: Role;
  updatedAt: string;
}

export interface ClinicSettings {
  centerName: string;
  tagline: string;
  address: string;
  phone: string;
  centers: string[];
  regPrefix: string;
  nextRegNumber: number;
  defaultPrinterMode: PrinterMode;
  lastSyncedAt: string | null;
  linkedFolderName: string | null;
  updatedAt: string;
}

export interface ClinicDatabase {
  schemaVersion: number;
  exportedAt: string;
  doctors: Doctor[];
  ashas: AshaWorker[];
  labTests: LabTest[];
  patients: PatientBill[];
  expenses: ExpenseEntry[];
  employees: EmployeeAccount[];
  settings: ClinicSettings;
}

export type NavRoute =
  | 'dashboard'
  | 'doctor-add'
  | 'doctor-view'
  | 'asha-add'
  | 'asha-view'
  | 'patient-add'
  | 'patient-view'
  | 'patient-tests'
  | 'lab-master'
  | 'report-eod'
  | 'report-expense-add'
  | 'report-expense-view'
  | 'report-doctor'
  | 'report-dc'
  | 'report-progress'
  | 'employee-view'
  | 'employee-account'
  | 'settings';

export type PrintDocument =
  | { kind: 'receipt'; patient: PatientBill }
  | { kind: 'eod'; date: string }
  | { kind: 'test-report'; patient: PatientBill };

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

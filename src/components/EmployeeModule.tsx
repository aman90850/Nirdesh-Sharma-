import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import type { EmployeeAccount, Role } from '../types/clinic';
import { ConfirmModal } from './ConfirmModal';

interface EmployeeModuleProps {
  subView: 'emp' | 'account';
  employees: EmployeeAccount[];
  currentUser: EmployeeAccount;
  onSaveEmployee: (emp: EmployeeAccount, isEdit: boolean) => void;
  onDeleteEmployee: (id: string) => void;
  onSwitchSubView: (view: 'emp' | 'account') => void;
}

export const EmployeeModule: React.FC<EmployeeModuleProps> = ({
  subView,
  employees,
  currentUser,
  onSaveEmployee,
  onDeleteEmployee,
  onSwitchSubView,
}) => {
  const isAdmin = currentUser.role === 'Admin';
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [empNo, setEmpNo] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('Operator');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<EmployeeAccount | null>(null);
  const [error, setError] = useState('');

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center max-w-lg mx-auto my-8">
        <Lock className="w-8 h-8 text-amber-600 mx-auto" />
        <h2 className="mt-3 font-display text-lg font-bold text-slate-900">Admin Access Required</h2>
        <p className="mt-1.5 text-sm text-slate-600">
          Employee records and staff login credentials can only be managed by an Administrator.
        </p>
      </div>
    );
  }

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setEmpNo('');
    setContactNo('');
    setEmailOrUsername('');
    setPassword('');
    setRole('Operator');
    setError('');
    setShowForm(false);
  };

  const startEdit = (emp: EmployeeAccount) => {
    setEditingId(emp.id);
    setName(emp.name);
    setEmpNo(emp.empNo);
    setContactNo(emp.contactNo);
    setEmailOrUsername(emp.emailOrUsername);
    setPassword(emp.password);
    setRole(emp.role);
    setError('');
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !empNo.trim() || !emailOrUsername.trim() || !password.trim()) {
      setError('Name, Emp No, Username/Email, and Password are required.');
      return;
    }

    onSaveEmployee(
      {
        id: editingId || `emp-${Date.now()}`,
        name: name.trim(),
        empNo: empNo.trim(),
        contactNo: contactNo.trim(),
        emailOrUsername: emailOrUsername.trim(),
        password: password.trim(),
        role,
        updatedAt: new Date().toISOString(),
      },
      Boolean(editingId)
    );
    resetForm();
  };

  const filtered = employees.filter((e) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      e.name.toLowerCase().includes(q) ||
      e.empNo.toLowerCase().includes(q) ||
      e.emailOrUsername.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900">
            {subView === 'emp' ? 'Employee List' : 'Staff Accounts & Role Access'}
          </h1>
          <p className="text-xs text-slate-500">
            Manage receptionists and Admin accounts. Operators have restricted access to protect cash and DC commissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => onSwitchSubView('emp')}
              className={`rounded-md px-3 py-1 text-xs font-semibold cursor-pointer ${
                subView === 'emp' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              View Emp
            </button>
            <button
              type="button"
              onClick={() => onSwitchSubView('account')}
              className={`rounded-md px-3 py-1 text-xs font-semibold cursor-pointer ${
                subView === 'account' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              View Account
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2B4C8C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E3A70] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Staff</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Staff Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-slate-900">
              {editingId ? 'Edit Staff Account' : 'Create New Staff Account'}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Emp No *</label>
              <input
                type="text"
                value={empNo}
                onChange={(e) => setEmpNo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact No</label>
              <input
                type="tel"
                value={contactNo}
                onChange={(e) => setContactNo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Login Username / Email *</label>
              <input
                type="text"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Access Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
              >
                <option value="Operator">Operator (Billing &amp; Today EOD only)</option>
                <option value="Admin">Admin (Full Access &amp; Commissions)</option>
              </select>
            </div>
          </div>

          {error && <p className="text-xs font-medium text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#2B4C8C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E3A70] cursor-pointer"
            >
              {editingId ? 'Update Account' : 'Save Account'}
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by employee name or EmpNo..."
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-4 w-16">Sno</th>
                <th className="py-2.5 px-4">Employee Name</th>
                <th className="py-2.5 px-4">EmpNo</th>
                {subView === 'emp' ? (
                  <th className="py-2.5 px-4">Contact No</th>
                ) : (
                  <>
                    <th className="py-2.5 px-4">Email-ID / Username</th>
                    <th className="py-2.5 px-4">Password</th>
                  </>
                )}
                <th className="py-2.5 px-4">Role</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map((emp, idx) => (
                <tr key={emp.id} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-4 font-mono text-slate-500">{idx + 1}</td>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">{emp.name}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-700">{emp.empNo}</td>
                  {subView === 'emp' ? (
                    <td className="py-2.5 px-4 font-mono text-slate-700">{emp.contactNo || '—'}</td>
                  ) : (
                    <>
                      <td className="py-2.5 px-4 font-mono text-slate-700">{emp.emailOrUsername}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-700">
                        <div className="inline-flex items-center gap-2">
                          <span>{visiblePasswords[emp.id] ? emp.password : '••••••••'}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setVisiblePasswords((prev) => ({ ...prev, [emp.id]: !prev[emp.id] }))
                            }
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
                            aria-label="Toggle password visibility"
                          >
                            {visiblePasswords[emp.id] ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                  <td className="py-2.5 px-4 font-semibold">
                    <span className={emp.role === 'Admin' ? 'text-[#2B4C8C]' : 'text-slate-600'}>
                      {emp.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => startEdit(emp)}
                        className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      {emp.id !== currentUser.id && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(emp)}
                          className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Staff Account"
        message={`Remove "${deleteTarget?.name}" (${deleteTarget?.emailOrUsername})? They will no longer be able to sign in.`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteEmployee(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
};

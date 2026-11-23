import React, { useState } from 'react';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import type { AshaWorker, Doctor, Role } from '../types/clinic';
import { ConfirmModal } from './ConfirmModal';

interface DoctorAshaModuleProps {
  entityType: 'doctor' | 'asha';
  mode: 'add' | 'view';
  items: Array<Doctor | AshaWorker>;
  userRole: Role;
  onSave: (item: Doctor | AshaWorker, isEdit: boolean) => void;
  onDelete: (id: string) => void;
  onSwitchMode: (mode: 'add' | 'view') => void;
}

export const DoctorAshaModule: React.FC<DoctorAshaModuleProps> = ({
  entityType,
  mode,
  items,
  userRole,
  onSave,
  onDelete,
  onSwitchMode,
}) => {
  const isDoctor = entityType === 'doctor';
  const label = isDoctor ? 'Doctor' : 'Asha';
  const isAdmin = userRole === 'Admin';

  // Add/Edit form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [stPercent, setStPercent] = useState('20');
  const [rtPercent, setRtPercent] = useState('40');
  const [address, setAddress] = useState('');
  const [formError, setFormError] = useState('');

  // View filter state
  const [selectedFilterId, setSelectedFilterId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Doctor | AshaWorker | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setStPercent(isDoctor ? '20' : '10');
    setRtPercent(isDoctor ? '40' : '15');
    setAddress('');
    setFormError('');
  };

  const startEdit = (item: Doctor | AshaWorker) => {
    setEditingId(item.id);
    setName(item.name);
    setPhone(item.phone);
    setStPercent(String(item.usgStPercent));
    setRtPercent(String(item.usgRtPercent));
    setAddress(item.address);
    setFormError('');
    onSwitchMode('add');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError(`${label} name is required.`);
      return;
    }

    const stVal = Number(stPercent);
    const rtVal = Number(rtPercent);
    if (Number.isNaN(stVal) || stVal < 0 || stVal > 100 || Number.isNaN(rtVal) || rtVal < 0 || rtVal > 100) {
      setFormError('Commission percentages must be between 0 and 100.');
      return;
    }

    const record: Doctor | AshaWorker = {
      id: editingId || `${entityType}-${Date.now()}`,
      name: trimmed.toUpperCase(),
      phone: phone.trim(),
      usgStPercent: stVal,
      usgRtPercent: rtVal,
      address: address.trim(),
      updatedAt: new Date().toISOString(),
    };

    onSave(record, Boolean(editingId));
    resetForm();
    onSwitchMode('view');
  };

  const filteredItems = items.filter((item) => {
    if (selectedFilterId && item.id !== selectedFilterId) return false;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (mode === 'add') {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900">
              {editingId ? `Edit ${label}` : `Add ${label}`}
            </h1>
            <p className="text-xs text-slate-500">
              Configure referral details and USG commission rates for S.T and R.T tests.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm();
              onSwitchMode('view');
            }}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            View {label} List ({items.length})
          </button>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {label} Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Enter ${label.toLowerCase()} name...`}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#2B4C8C] focus:outline-none focus:ring-2 focus:ring-[#2B4C8C]/15"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:border-[#2B4C8C] focus:outline-none focus:ring-2 focus:ring-[#2B4C8C]/15"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">USG % (S.T)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={stPercent}
                onChange={(e) => setStPercent(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 focus:border-[#2B4C8C] focus:outline-none focus:ring-2 focus:ring-[#2B4C8C]/15"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">USG % (R.T)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={rtPercent}
                onChange={(e) => setRtPercent(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 focus:border-[#2B4C8C] focus:outline-none focus:ring-2 focus:ring-[#2B4C8C]/15"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Address / Hospital</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Clinic, PHC, or hospital address"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#2B4C8C] focus:outline-none focus:ring-2 focus:ring-[#2B4C8C]/15"
              />
            </div>
          </div>

          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700">
              {formError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onSwitchMode('view');
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            )}
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2B4C8C] px-5 py-2 text-xs font-semibold text-white hover:bg-[#1E3A70] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{editingId ? `Update ${label}` : isDoctor ? 'Add Doctor' : 'Save Asha'}</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900">
            {isDoctor ? 'Doctors List' : 'Asha / Referral Workers List'}
          </h1>
          <p className="text-xs text-slate-500">
            {items.length} registered {isDoctor ? 'doctors' : 'Asha workers'} with S.T and R.T commission slabs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            onSwitchMode('add');
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#2B4C8C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E3A70] cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add {label}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Select {label}
          </label>
          <select
            value={selectedFilterId}
            onChange={(e) => setSelectedFilterId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#2B4C8C] focus:outline-none"
          >
            <option value="">All {isDoctor ? 'Doctors' : 'Asha Workers'}</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Quick Search</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={`Search by name, phone, or address...`}
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-[#2B4C8C] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-700">No {label.toLowerCase()} records found</p>
            <button
              type="button"
              onClick={() => {
                setSelectedFilterId('');
                setSearchText('');
                if (items.length === 0) onSwitchMode('add');
              }}
              className="mt-3 rounded-lg bg-[#2B4C8C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E3A70] cursor-pointer"
            >
              {items.length === 0 ? `Add First ${label}` : 'Clear Filters'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4 w-16">Sno</th>
                  <th className="py-2.5 px-4">{label} Name</th>
                  <th className="py-2.5 px-4">Phone</th>
                  <th className="py-2.5 px-4">Address</th>
                  {isAdmin && <th className="py-2.5 px-4 text-right">USG % (S.T)</th>}
                  {isAdmin && <th className="py-2.5 px-4 text-right">USG % (R.T)</th>}
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-500 tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{item.name}</td>
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-600">
                      {item.phone || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-600">{item.address || '—'}</td>
                    {isAdmin && (
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-semibold text-slate-800 tabular-nums">
                        {item.usgStPercent}%
                      </td>
                    )}
                    {isAdmin && (
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-semibold text-slate-800 tabular-nums">
                        {item.usgRtPercent}%
                      </td>
                    )}
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                          title={`Edit ${label}`}
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 cursor-pointer"
                            title={`Delete ${label}`}
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
        )}
      </div>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={`Delete ${label}`}
        message={`Are you sure you want to remove "${deleteTarget?.name}"? Existing patient bills will keep their records intact.`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            onDelete(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
};

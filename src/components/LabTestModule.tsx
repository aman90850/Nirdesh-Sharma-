import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import type { LabTest, Role, TestParent, TestType } from '../types/clinic';
import { formatCurrency } from '../utils/calculations';
import { ConfirmModal } from './ConfirmModal';

interface LabTestModuleProps {
  labTests: LabTest[];
  userRole: Role;
  onSaveTest: (test: LabTest, isEdit: boolean) => void;
  onDeleteTest: (id: string) => void;
}

export const LabTestModule: React.FC<LabTestModuleProps> = ({
  labTests,
  userRole,
  onSaveTest,
  onDeleteTest,
}) => {
  const isAdmin = userRole === 'Admin';
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [parent, setParent] = useState<TestParent>('Ultrasound');
  const [type, setType] = useState<TestType>('S.T');
  const [error, setError] = useState('');

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [parentFilter, setParentFilter] = useState<'ALL' | TestParent>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | TestType>('ALL');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<LabTest | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setAmount('');
    setParent('Ultrasound');
    setType('S.T');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = title.trim();
    const numericAmt = Number(amount);
    if (!trimmed) {
      setError('Test title name is required.');
      return;
    }
    if (Number.isNaN(numericAmt) || numericAmt < 0) {
      setError('Enter a valid test amount.');
      return;
    }

    onSaveTest(
      {
        id: editingId || `test-${Date.now()}`,
        title: trimmed.toUpperCase(),
        amount: numericAmt,
        parent,
        type,
        updatedAt: new Date().toISOString(),
      },
      Boolean(editingId)
    );
    resetForm();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return labTests.filter((t) => {
      if (parentFilter !== 'ALL' && t.parent !== parentFilter) return false;
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
      if (q && !t.title.toLowerCase().includes(q) && !t.parent.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [labTests, search, parentFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-[1.75rem] font-bold text-[#1E2B4D]">Test master</h1>
        <p className="mt-1 text-[15px] text-slate-600">
          Every USG and X-ray test with its rate and S.T / R.T category ({labTests.length} tests).
        </p>
      </div>

      {/* Add / Edit Record Form */}
      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-slate-900">
            {editingId ? 'Edit Test Record' : 'Add Test Record'}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel Edit</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
          <div className="lg:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Test Title Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. USG WHOLE ABDOMEN"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#1E2B4D] focus:outline-none"
              required
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Test Amt (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="900"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 focus:border-[#1E2B4D] focus:outline-none"
              required
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Test Parent</label>
            <select
              value={parent}
              onChange={(e) => setParent(e.target.value as TestParent)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1E2B4D] focus:outline-none"
            >
              <option value="Ultrasound">Ultrasound</option>
              <option value="X-Ray">X-Ray</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status (Type)</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TestType)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-900 focus:border-[#1E2B4D] focus:outline-none"
            >
              <option value="S.T">S.T</option>
              <option value="R.T">R.T</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1E2B4D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#142036] transition-colors whitespace-nowrap cursor-pointer h-[38px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{editingId ? 'Update' : 'Add Record'}</span>
            </button>
          </div>
        </div>

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      </form>

      {/* Catalog Table Card */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              {(['ALL', 'Ultrasound', 'X-Ray'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setParentFilter(cat);
                    setPage(1);
                  }}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    parentFilter === cat
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat === 'ALL' ? 'All Categories' : cat}
                </button>
              ))}
            </div>

            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              {(['ALL', 'S.T', 'R.T'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTypeFilter(t);
                    setPage(1);
                  }}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold font-mono transition-colors cursor-pointer ${
                    typeFilter === t
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t === 'ALL' ? 'All' : t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search test title..."
                className="w-56 rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-[#1E2B4D] focus:outline-none"
              />
            </div>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700"
              aria-label="Rows per page"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-4 w-16">S.N</th>
                <th className="py-2.5 px-4">Test Title</th>
                <th className="py-2.5 px-4">Test Parent</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                    No matching lab tests found.
                  </td>
                </tr>
              ) : (
                paginated.map((test, idx) => (
                  <tr key={test.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-500 tabular-nums">
                      {(safePage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">{test.title}</td>
                    <td className="py-2.5 px-4 text-xs text-slate-600">{test.parent}</td>
                    <td className="py-2.5 px-4 font-mono text-xs font-semibold text-slate-700">
                      {test.type}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(test.amount)}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(test.id);
                            setTitle(test.title);
                            setAmount(String(test.amount));
                            setParent(test.parent);
                            setType(test.type);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(test)}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span>
            Showing {filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1} to{' '}
            {Math.min(safePage * pageSize, filtered.length)} of {filtered.length} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-slate-200 px-2.5 py-1 font-medium hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-2 font-mono font-semibold text-slate-800">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-md border border-slate-200 px-2.5 py-1 font-medium hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Test from USG Master"
        message={`Remove "${deleteTarget?.title}" from the test catalog? Past patient bills remain unchanged.`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteTest(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
};

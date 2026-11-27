import React, { useMemo, useState } from 'react';
import type { ActivityEntry } from '../types/clinic';
import { roleLabel } from '../utils/roles';

interface Props {
  entries: ActivityEntry[];
}

export const ActivityLogView: React.FC<Props> = ({ entries }) => {
  const [query, setQuery] = useState('');
  const [person, setPerson] = useState('all');
  const people = useMemo(() => Array.from(new Set(entries.map((e) => e.userName))).sort(), [entries]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .filter((e) => person === 'all' || e.userName === person)
      .filter((e) => !q || `${e.action} ${e.detail}`.toLowerCase().includes(q))
      .slice(0, 500);
  }, [entries, query, person]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-[1.75rem] font-bold text-[#1E2B4D]">Activity log</h1>
        <p className="mt-1 text-[15px] text-slate-600">
          Who created, edited or deleted what, newest first. Only the Admin can see this page.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-[#DCE1DA] bg-white p-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search, e.g. SG-1003 or deleted"
          className="min-w-[240px] flex-1 rounded-md border border-[#CBD2C9] px-3 py-2 text-sm"
          aria-label="Search activity"
        />
        <select
          value={person}
          onChange={(e) => setPerson(e.target.value)}
          className="rounded-md border border-[#CBD2C9] bg-white px-3 py-2 text-sm"
          aria-label="Filter by person"
        >
          <option value="all">Everyone</option>
          {people.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-[#DCE1DA] bg-white overflow-hidden">
        {shown.length === 0 ? (
          <p className="p-10 text-center text-[15px] text-slate-500">
            {entries.length === 0 ? 'Nothing recorded yet. Actions appear here as staff work.' : 'No activity matches this search.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DCE1DA] text-sm">
                  <th className="py-2.5 px-4">When</th>
                  <th className="py-2.5 px-4">Who</th>
                  <th className="py-2.5 px-4">What</th>
                  <th className="py-2.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {shown.map((e) => {
                  const d = new Date(e.at);
                  const deleted = /deleted/i.test(e.action);
                  return (
                    <tr key={e.id}>
                      <td className="py-2.5 px-4 whitespace-nowrap text-slate-600 tabular-nums">
                        {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })},{' '}
                        {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">{e.userName}</span>{' '}
                        <span className="text-slate-500">({roleLabel(e.role)})</span>
                      </td>
                      <td className={`py-2.5 px-4 whitespace-nowrap font-semibold ${deleted ? 'text-[#B42318]' : 'text-[#1E2B4D]'}`}>
                        {e.action}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">{e.detail || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

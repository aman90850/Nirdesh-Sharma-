import React, { useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileSpreadsheet,
  FlaskConical,
  FolderSync,
  HeartHandshake,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Settings,
  Stethoscope,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import type { ClinicSettings, EmployeeAccount, NavRoute } from '../types/clinic';
import { SigmaLogo } from './SigmaLogo';
import { OfflineIndicator, PWAInstallButton } from './PWAInstallButton';

interface LayoutShellProps {
  activeRoute: NavRoute;
  onNavigate: (route: NavRoute) => void;
  currentUser: EmployeeAccount;
  settings: ClinicSettings;
  folderConnected: boolean;
  folderName: string | null;
  hasSavedFolderToResume: boolean;
  onOpenFolderSync: () => void;
  onResumeFolder: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  route?: NavRoute;
  children?: Array<{
    route: NavRoute;
    label: string;
    adminOnly?: boolean;
  }>;
}

const ROUTE_BREADCRUMBS: Record<NavRoute, [string, string]> = {
  dashboard: ['Dashboard', 'Overview'],
  'doctor-add': ['Doctor', 'Add Doctor'],
  'doctor-view': ['Doctor', 'View Doctors'],
  'asha-add': ['Asha', 'Add Asha'],
  'asha-view': ['Asha', 'View Asha'],
  'patient-add': ['Manage Patient', 'Add Patient & Billing'],
  'patient-view': ['Manage Patient', 'View Patients'],
  'patient-tests': ['Manage Patient', 'View Patient Tests'],
  'lab-master': ['Lab Test', 'USG & X-Ray Master'],
  'report-eod': ['Manage Report', 'End-of-Day Transaction Summary'],
  'report-expense-add': ['Manage Report', 'Add Expense (CR / DR)'],
  'report-expense-view': ['Manage Report', 'View Expenses'],
  'report-doctor': ['Manage Report', "Doctor's Report"],
  'report-dc': ['Manage Report', 'Dr. & Asha DC Commission Report'],
  'report-progress': ['Manage Report', 'Dr. Progress Report'],
  'employee-view': ['Manage Employee', 'View Employees'],
  'employee-account': ['Manage Employee', 'View Accounts & Roles'],
  settings: ['System', 'Clinic Settings & Sync'],
};

export const LayoutShell: React.FC<LayoutShellProps> = ({
  activeRoute,
  onNavigate,
  currentUser,
  settings,
  folderConnected,
  folderName,
  hasSavedFolderToResume,
  onOpenFolderSync,
  onResumeFolder,
  onLogout,
  children,
}) => {
  const isAdmin = currentUser.role === 'Admin';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    doctor: false,
    asha: false,
    patient: true,
    lab: false,
    report: true,
    employee: false,
  });

  const navGroups: NavGroup[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      route: 'dashboard',
    },
    {
      id: 'eod-direct',
      label: 'End-of-Day Summary',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      route: 'report-eod',
    },
    {
      id: 'patient',
      label: 'Manage Patient',
      icon: <Users className="w-4 h-4" />,
      children: [
        { route: 'patient-add', label: 'Add Patient' },
        { route: 'patient-view', label: 'View Patient' },
        { route: 'patient-tests', label: 'View Patient Test' },
      ],
    },
    {
      id: 'doctor',
      label: 'Doctor',
      icon: <Stethoscope className="w-4 h-4" />,
      children: [
        { route: 'doctor-add', label: 'Add Doctor' },
        { route: 'doctor-view', label: 'View Doctor' },
      ],
    },
    {
      id: 'asha',
      label: 'Asha',
      icon: <HeartHandshake className="w-4 h-4" />,
      children: [
        { route: 'asha-add', label: 'Add Asha' },
        { route: 'asha-view', label: 'View Asha' },
      ],
    },
    {
      id: 'lab',
      label: 'Lab Test',
      icon: <FlaskConical className="w-4 h-4" />,
      children: [{ route: 'lab-master', label: 'USG Master' }],
    },
    {
      id: 'report',
      label: 'Manage Report',
      icon: <BarChart3 className="w-4 h-4" />,
      children: [
        { route: 'report-eod', label: 'End-of-Day Summary' },
        { route: 'report-expense-add', label: 'Add Expense' },
        { route: 'report-expense-view', label: 'View Expense' },
        { route: 'report-doctor', label: "Doctor's Report", adminOnly: true },
        { route: 'report-dc', label: 'Dr. Dc Report', adminOnly: true },
        { route: 'report-progress', label: 'Dr Progress Report' },
      ],
    },
    {
      id: 'employee',
      label: 'Manage Employee',
      icon: <UserCog className="w-4 h-4" />,
      adminOnly: true,
      children: [
        { route: 'employee-view', label: 'View Emp', adminOnly: true },
        { route: 'employee-account', label: 'View Account', adminOnly: true },
      ],
    },
    {
      id: 'settings',
      label: 'Clinic Settings',
      icon: <Settings className="w-4 h-4" />,
      adminOnly: true,
      route: 'settings',
    },
  ];

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectRoute = (route: NavRoute) => {
    onNavigate(route);
    setMobileOpen(false);
  };

  const [sectionCrumb, pageCrumb] = ROUTE_BREADCRUMBS[activeRoute] || ['Dashboard', 'Overview'];

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col bg-[#1E2B4D] text-slate-200">
      {/* Brand Block */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <button
          type="button"
          onClick={() => handleSelectRoute('dashboard')}
          className="flex items-center gap-3 text-left cursor-pointer"
        >
          <SigmaLogo size={38} className="shrink-0" />
          <div className="min-w-0">
            <div className="font-display text-sm font-bold text-white leading-tight truncate">
              Sigma Diagnostic
            </div>
            <div className="text-[11px] text-slate-300 truncate">&amp; USG Center</div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden rounded-lg p-1.5 text-slate-300 hover:bg-white/10 cursor-pointer"
          aria-label="Close navigation menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Menu List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-slate-400">
          Menu
        </div>
        {navGroups.map((group) => {
          if (group.adminOnly && !isAdmin) return null;

          if (group.route) {
            const active = activeRoute === group.route;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => handleSelectRoute(group.route!)}
                className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#2B4C8C] text-white'
                    : 'text-slate-300 hover:bg-white/8 hover:text-white'
                }`}
              >
                {group.icon}
                <span className="truncate">{group.label}</span>
              </button>
            );
          }

          const visibleChildren = (group.children || []).filter(
            (child) => !child.adminOnly || isAdmin
          );
          const isChildActive = visibleChildren.some((c) => c.route === activeRoute);
          const isOpen = openGroups[group.id] || isChildActive;

          return (
            <div key={group.id}>
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isChildActive
                    ? 'bg-white/10 text-white'
                    : 'text-slate-300 hover:bg-white/8 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  {group.icon}
                  <span className="truncate">{group.label}</span>
                </span>
                {isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="mt-1 ml-4 pl-3 border-l border-white/12 space-y-0.5">
                  {visibleChildren.map((child) => {
                    const active = activeRoute === child.route;
                    return (
                      <button
                        key={child.route}
                        type="button"
                        onClick={() => handleSelectRoute(child.route)}
                        className={`w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] transition-colors whitespace-nowrap cursor-pointer ${
                          active
                            ? 'bg-[#2B4C8C] text-white font-semibold'
                            : 'text-slate-300 hover:bg-white/8 hover:text-white'
                        }`}
                      >
                        <span className="truncate">{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {!isAdmin && (
          <div className="mt-4 mx-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5 font-semibold text-white">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Operator Mode Active</span>
            </div>
            <p className="mt-1 text-slate-400 leading-relaxed">
              Deleting bills, backdated edits, and Doctor/Asha DC Commission reports require Admin login.
            </p>
          </div>
        )}
      </nav>

      {/* Bottom Quick Action: New Patient Bill */}
      <div className="p-3 border-t border-white/10 space-y-2">
        <button
          type="button"
          onClick={() => handleSelectRoute('patient-add')}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white hover:bg-[#15803D] transition-colors whitespace-nowrap cursor-pointer"
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>New Patient Bill</span>
        </button>
        <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
          <span className="truncate">{currentUser.name}</span>
          <span className="font-mono text-slate-300">{currentUser.role}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div id="sigma-app-shell" className="min-h-screen flex bg-[#F8FAFC]">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:block w-64 shrink-0 border-r border-slate-200 sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 max-w-[82vw] h-full shadow-2xl">{renderSidebarContent()}</div>
          <div
            className="flex-1 bg-slate-900/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar (1-row clinical contract: Breadcrumbs left, Sync + Install + User right) */}
        <header className="no-print sticky top-0 z-30 h-14 border-b border-slate-200 bg-white px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline font-medium text-slate-500 whitespace-nowrap">
                {sectionCrumb}
              </span>
              <span className="hidden sm:inline text-slate-300">/</span>
              <span className="font-display font-bold text-slate-900 truncate">{pageCrumb}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Resume previously linked folder prompt OR Folder Sync status button */}
            {hasSavedFolderToResume && !folderConnected ? (
              <button
                type="button"
                onClick={onResumeFolder}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FolderSync className="w-3.5 h-3.5 text-amber-700" />
                <span>Resume Folder Sync</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenFolderSync}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  folderConnected
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                title="Manage local PC folder sync & portable backup"
              >
                <FolderSync className="w-3.5 h-3.5" />
                <span>{folderConnected ? `Synced: ${folderName || 'Folder'}` : 'Folder Sync'}</span>
              </button>
            )}

            <PWAInstallButton />

            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200 text-xs text-slate-600 whitespace-nowrap">
              <span className="font-semibold text-slate-800">{currentUser.name}</span>
              <span aria-hidden="true">·</span>
              <span className={isAdmin ? 'text-[#2B4C8C] font-semibold' : 'text-slate-500'}>
                {currentUser.role}
              </span>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">{children}</main>

        <footer className="no-print border-t border-slate-200 bg-white px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>{settings.centerName}</span>
          <span>
            Local Storage Active
            {settings.lastSyncedAt
              ? ` · Last Synced ${new Date(settings.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : ''}
          </span>
        </footer>
      </div>

      <OfflineIndicator />
    </div>
  );
};

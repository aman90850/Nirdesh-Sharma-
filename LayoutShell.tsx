import React, { useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileSpreadsheet,
  FlaskConical,
  FolderSync,
  HardDriveDownload,
  HeartHandshake,
  History,
  KeyRound,
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
import { PoweredBy } from './PoweredBy';
import { roleLabel } from '../utils/roles';
import { ThemeToggle } from './ThemeToggle';
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
  onChangePassword: () => void;
  backupDue: boolean;
  lastBackupAt: string | null;
  onBackupNow: () => void;
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
  'patient-add': ['Manage Patient', 'New patient bill'],
  'patient-view': ['Manage Patient', 'Patients'],
  'patient-tests': ['Manage Patient', 'Test reports'],
  'lab-master': ['Lab Test', 'Test master'],
  'report-eod': ['Manage Report', 'End-of-day summary'],
  'report-expense-add': ['Manage Report', 'Add Expense (CR / DR)'],
  'report-expense-view': ['Manage Report', 'View Expenses'],
  'report-doctor': ['Manage Report', "Doctor's Report"],
  'report-dc': ['Manage Report', 'DC commission'],
  'report-progress': ['Manage Report', 'Dr. Progress Report'],
  'employee-view': ['Manage Employee', 'View Employees'],
  'employee-account': ['Manage Employee', 'View Accounts & Roles'],
  settings: ['System', 'Clinic settings'],
  'activity-log': ['System', 'Activity log'],
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
  onChangePassword,
  backupDue,
  lastBackupAt,
  onBackupNow,
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
      adminOnly: true,
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
        { route: 'report-eod', label: 'End-of-Day Summary', adminOnly: true },
        { route: 'report-expense-add', label: 'Add Expense' },
        { route: 'report-expense-view', label: 'View Expense' },
        { route: 'report-doctor', label: "Doctor's Report", adminOnly: true },
        { route: 'report-dc', label: 'Dr. Dc Report', adminOnly: true },
        { route: 'report-progress', label: 'Dr Progress Report', adminOnly: true },
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
    {
      id: 'activity-log',
      label: 'Activity log',
      icon: <History className="w-4 h-4" />,
      adminOnly: true,
      route: 'activity-log',
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
    <div className="brand-panel flex h-full flex-col bg-[#1E2B4D] text-slate-200">
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

        {navGroups.map((group) => {
          if (group.adminOnly && !isAdmin) return null;

          if (group.route) {
            const active = activeRoute === group.route;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => handleSelectRoute(group.route!)}
                aria-current={active ? 'page' : undefined}
                className={`relative w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-[15px] transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-white/[0.09] text-white font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-full before:bg-[#3DD07A]'
                    : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
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
                aria-expanded={isOpen}
                className={`w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-[15px] transition-colors whitespace-nowrap cursor-pointer ${
                  isChildActive ? 'text-white font-semibold' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
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
                <div className="mt-0.5 mb-1 ml-5 pl-3 border-l border-white/10 space-y-0.5">
                  {visibleChildren.map((child) => {
                    const active = activeRoute === child.route;
                    return (
                      <button
                        key={child.route}
                        type="button"
                        onClick={() => handleSelectRoute(child.route)}
                        aria-current={active ? 'page' : undefined}
                        className={`relative w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors whitespace-nowrap cursor-pointer ${
                          active
                            ? 'bg-white/[0.09] text-white font-semibold before:absolute before:-left-[13px] before:top-1 before:bottom-1 before:w-[3px] before:rounded-full before:bg-[#3DD07A]'
                            : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
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
              <span>{'User Access'}</span>
            </div>
            <p className="mt-1 text-slate-400 leading-relaxed">
              {'Summaries, reports, deleting bills and backdated edits need the Admin login.'}
            </p>
          </div>
        )}
      </nav>

      {/* Bottom Quick Action: New Patient Bill */}
      <div className="p-3 border-t border-white/10 space-y-2">
        <button
          type="button"
          onClick={() => handleSelectRoute('patient-add')}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-[#128041] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#0E6A35] transition-colors whitespace-nowrap cursor-pointer"
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>{'New Patient Bill'}</span>
        </button>
        <div className="flex items-center gap-2.5 px-1 py-1">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white ring-1 ring-white/20">
            {currentUser.name.trim().charAt(0).toUpperCase() || 'U'}
          </span>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-white">{currentUser.name}</div>
            <div className="text-[11px] text-slate-400">{roleLabel(currentUser.role)}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div id="sigma-app-shell" className="min-h-screen flex bg-[#F2F4F0]">
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
        <header className="no-print sticky top-0 z-30 h-16 border-b border-[#DCE1DA] bg-[#F2F4F0] px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4">
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
              {sectionCrumb && (
                <>
                  <span className="hidden sm:inline font-medium text-slate-500 whitespace-nowrap">
                    {sectionCrumb}
                  </span>
                  <span className="hidden sm:inline text-slate-300">/</span>
                </>
              )}
              <span className="font-display text-lg font-bold text-[#1E2B4D] truncate">{pageCrumb}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Resume previously linked folder prompt OR Folder Sync status button */}
            {hasSavedFolderToResume && !folderConnected ? (
              <button
                type="button"
                onClick={onResumeFolder}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FolderSync className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden lg:inline">Resume Folder Sync</span>
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
                aria-label="Folder sync and backup"
              >
                <FolderSync className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{folderConnected ? `Synced: ${folderName || 'Folder'}` : 'Folder Sync'}</span>
              </button>
            )}
            <ThemeToggle />
            <span className="hidden sm:contents">
              <PWAInstallButton />
            </span>

            <div className="hidden md:flex items-center gap-2.5 pl-3 border-l border-slate-200 whitespace-nowrap">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E2B4D] text-xs font-bold text-white">
                {currentUser.name.trim().charAt(0).toUpperCase() || 'U'}
              </span>
              <div className="leading-tight">
                {currentUser.name.trim().toLowerCase() !== roleLabel(currentUser.role).toLowerCase() && (
                  <div className="text-xs font-semibold text-slate-800">{currentUser.name}</div>
                )}
                <span
                  className={`inline-block rounded-full px-1.5 py-px text-[10px] font-semibold ${
                    isAdmin ? 'bg-[#1E2B4D]/10 text-[#1E2B4D]' : 'bg-[#128041]/10 text-[#0E6A35]'
                  }`}
                >
                  {roleLabel(currentUser.role)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onChangePassword}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Change your password"
              aria-label="Change your password"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">{'Password'}</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{'Sign Out'}</span>
            </button>
          </div>
        </header>

        {/* Page Viewport */}
        {backupDue && (
          <div role="status" className="no-print border-b border-[#E9C98F] bg-[#FDF6E7] px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[15px] text-[#6B4106]">
              <strong className="font-semibold">{'No backup taken today.'}</strong>{' '}
              {lastBackupAt
                ? `${'Last backup:'} ${new Date(lastBackupAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.`
                : 'This PC has never been backed up.'}{' '}
              {'If this computer fails, data since then is lost.'}
            </p>
            <button
              type="button"
              onClick={onBackupNow}
              className="inline-flex items-center gap-2 rounded-md bg-[#C8740A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A85F06] transition-colors cursor-pointer"
            >
              <HardDriveDownload className="w-4 h-4" />
              <span>{folderConnected ? 'Save backup to folder' : 'Download backup'}</span>
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">{children}</main>

        <footer className="no-print border-t border-[#DCE1DA] px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>{settings.centerName}</span>
          <PoweredBy />
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

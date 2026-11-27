import type { NavRoute, Role } from '../types/clinic';

/** Pages that show money totals / business summaries. Only Admin can open them. */
export const SUMMARY_ROUTES: NavRoute[] = [
  'report-eod',
  'report-doctor',
  'report-dc',
  'report-progress',
];

/** Pages that are Admin-only for other reasons (staff accounts, settings). */
const ADMIN_ONLY_ROUTES: NavRoute[] = ['employee-view', 'employee-account', 'settings', 'activity-log'];

export function canViewRoute(role: Role, route: NavRoute): boolean {
  if (role === 'Admin') return true;
  return !SUMMARY_ROUTES.includes(route) && !ADMIN_ONLY_ROUTES.includes(route);
}

/** Display name for a role. The stored value stays 'Operator' so old data keeps working. */
export function roleLabel(role: Role): string {
  return role === 'Admin' ? 'Admin' : 'User';
}

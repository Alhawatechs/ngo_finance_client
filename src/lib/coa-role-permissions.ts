/** Permissions only Super Admin / Finance Director may attach to roles (assign-chart-of-accounts-permissions). */
export const COA_ROLE_ASSIGN_PERMISSION_NAMES = [
  'edit-chart-of-accounts',
  'delete-chart-of-accounts',
  'delete-chart-of-accounts-permanently',
  'assign-chart-of-accounts-permissions',
  'view-opening-balances',
  'edit-opening-balances',
] as const

export function isRestrictedCoaRolePermission(permissionName: string): boolean {
  return (COA_ROLE_ASSIGN_PERMISSION_NAMES as readonly string[]).includes(permissionName)
}

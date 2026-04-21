import { useAuthStore } from '@/stores/authStore'

/**
 * Permissions that grant access to the Chart of Accounts submodule (all tabs).
 * Aligns with Account list: view, legacy manage, edit, delete, permanent delete, or delegation.
 */
export const COA_MODULE_ACCESS_PERMISSIONS = [
  'view-chart-of-accounts',
  'manage-chart-of-accounts',
  'edit-chart-of-accounts',
  'delete-chart-of-accounts',
  'delete-chart-of-accounts-permanently',
  'assign-chart-of-accounts-permissions',
] as const

function isSuperAdminRole(
  user: { is_super_admin?: boolean; roles?: { name: string }[] } | null | undefined
): boolean {
  if (user?.is_super_admin === true) return true
  if (user?.roles?.some((r) => r.name === 'super-admin' || r.name?.toLowerCase() === 'super-admin')) {
    return true
  }
  return false
}

/**
 * Same pattern as Account list: edit = create/update/status; delete = soft delete + restore.
 * Super Administrator has full access (matches backend Gate::before).
 */
export function useChartOfAccountsPermissions() {
  const user = useAuthStore((state) => state.user)
  const superAdmin = isSuperAdminRole(user)

  const permissionList = Array.isArray(user?.permissions) ? user.permissions : []
  const hasPerm = (name: string) => permissionList.includes(name)

  const canEditCoa = superAdmin || hasPerm('edit-chart-of-accounts')
  /** Required to import from CSV/Excel (explicit codes). */
  const canEditCoaCode = superAdmin || hasPerm('edit-chart-of-accounts-code')
  const canImportCoa = canEditCoa && canEditCoaCode
  const canDeleteCoa = superAdmin || hasPerm('delete-chart-of-accounts')
  const canViewCoaModule =
    superAdmin ||
    COA_MODULE_ACCESS_PERMISSIONS.some((p) => hasPerm(p))
  const canManageCoaLegacy = superAdmin || hasPerm('manage-chart-of-accounts')

  const canViewAccountStatement =
    superAdmin ||
    [
      'view-chart-of-accounts',
      'manage-chart-of-accounts',
      'edit-chart-of-accounts',
      'delete-chart-of-accounts',
      'delete-chart-of-accounts-permanently',
      'assign-chart-of-accounts-permissions',
    ].some((p) => hasPerm(p))

  /** Opening Balances tab — default Super Admin / Finance Director; assignable by COA permission delegates. */
  const canViewOpeningBalances = superAdmin || hasPerm('view-opening-balances')

  /** Edit opening amounts: explicit permission, full COA edit, legacy manage, or Super Admin. */
  const canEditOpeningBalances =
    superAdmin ||
    hasPerm('edit-opening-balances') ||
    hasPerm('edit-chart-of-accounts') ||
    hasPerm('manage-chart-of-accounts')

  return {
    canEditCoa,
    canEditCoaCode,
    canImportCoa,
    canDeleteCoa,
    canViewCoaModule,
    canManageCoaLegacy,
    canViewAccountStatement,
    canViewOpeningBalances,
    canEditOpeningBalances,
  }
}

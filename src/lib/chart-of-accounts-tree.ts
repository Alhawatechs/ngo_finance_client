import type { ChartOfAccount } from '@/types'

/** Default tree expansion depth (0 = root / category, 1 = subcategory). Matches Account List. */
export const DEFAULT_COA_EXPAND_MAX_DEPTH = 1

/** Collect all account ids that have children (expandable nodes). */
export function getExpandableAccountIds(accounts: ChartOfAccount[] | undefined | null): Set<number> {
  const ids = new Set<number>()
  if (!Array.isArray(accounts) || accounts.length === 0) return ids
  const walk = (list: ChartOfAccount[]) => {
    for (const acc of list) {
      if (!acc || typeof acc.id !== 'number') continue
      if (Array.isArray(acc.children) && acc.children.length > 0) {
        ids.add(acc.id)
        walk(acc.children)
      }
    }
  }
  walk(accounts)
  return ids
}

/**
 * Collect ids to expand by default. `depth` is tree depth from the list root (0 = L1 category, 1 = L2 subcategory, …).
 * Nodes with children are expanded while `depth <= maxDepth`.
 */
export function getDefaultExpandedIds(accounts: ChartOfAccount[] | undefined | null, maxDepth: number): Set<number> {
  const ids = new Set<number>()
  if (!Array.isArray(accounts) || accounts.length === 0) return ids
  const walk = (list: ChartOfAccount[], depth: number) => {
    if (depth > maxDepth + 1) return
    for (const acc of list) {
      if (!acc || typeof acc.id !== 'number') continue
      if (Array.isArray(acc.children) && acc.children.length > 0 && depth <= maxDepth) {
        ids.add(acc.id)
        walk(acc.children, depth + 1)
      }
    }
  }
  walk(accounts, 0)
  return ids
}

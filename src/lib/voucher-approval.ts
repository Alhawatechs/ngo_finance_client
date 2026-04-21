import type { User } from '@/lib/api/auth'
import type { Voucher } from '@/types'
import { APPROVAL_LEVELS } from '@/lib/api/vouchers'

function userIsSuperAdmin(
  user: (Pick<User, 'is_super_admin'> & Partial<Pick<User, 'roles'>>) | null | undefined
): boolean {
  if (!user) return false
  if (user.is_super_admin) return true
  return user.roles?.some((r) => r.name === 'super-admin') ?? false
}

export type VoucherStepEligibility = {
  /** User may approve or reject at the current workflow step (client preview; server is authoritative). */
  canAct: boolean
  blockReasons: string[]
  nextLevel: number | null
  nextTitle: string
}

/**
 * Mirrors server rules for signing the pending step: super-admin, approval level &gt; current_approval_level,
 * and optional per-user amount limit in base currency.
 */
export function getVoucherStepApprovalEligibility(
  user: Pick<User, 'approval_level' | 'approval_limit' | 'is_super_admin'> | null | undefined,
  voucher: Pick<Voucher, 'status' | 'current_approval_level' | 'required_approval_level' | 'base_currency_amount'>
): VoucherStepEligibility {
  const blockReasons: string[] = []

  if (voucher.status !== 'pending_approval') {
    return {
      canAct: false,
      blockReasons: ['This voucher is not pending approval.'],
      nextLevel: null,
      nextTitle: '',
    }
  }

  const current = voucher.current_approval_level ?? 0
  const required = voucher.required_approval_level ?? 1
  const nextLevel = current < required ? current + 1 : null

  if (nextLevel === null) {
    return {
      canAct: false,
      blockReasons: ['No further approval step is pending.'],
      nextLevel: null,
      nextTitle: '',
    }
  }

  const levelMeta = APPROVAL_LEVELS.find((x) => x.level === nextLevel)
  const nextTitle = levelMeta?.name ?? `Level ${nextLevel}`

  if (userIsSuperAdmin(user)) {
    return { canAct: true, blockReasons: [], nextLevel, nextTitle }
  }

  const userLevel = user?.approval_level ?? 0
  if (userLevel <= current) {
    blockReasons.push(
      `The next signature required is ${nextTitle}. Your approval level must be higher than the last completed level (${current}).`
    )
  }

  const limit = user?.approval_limit
  if (limit != null && Number(voucher.base_currency_amount) > Number(limit)) {
    blockReasons.push(
      `Amount in base currency exceeds your personal approval limit (${limit}).`
    )
  }

  return {
    canAct: blockReasons.length === 0,
    blockReasons,
    nextLevel,
    nextTitle,
  }
}

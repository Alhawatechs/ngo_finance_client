/**
 * Common status color and label utilities
 * Consolidated from various API files to avoid duplication
 */

// Generic status colors
const statusColors: Record<string, string> = {
  // Common statuses
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-yellow-100 text-yellow-700',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  submitted: 'bg-emerald-100 text-emerald-800',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-red-100 text-red-700',
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-700',
  closed: 'bg-gray-100 text-gray-700',
  completed: 'bg-purple-100 text-purple-700',
  posted: 'bg-green-100 text-green-700',
  on_hold: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-orange-100 text-orange-700',
  planning: 'bg-emerald-100 text-emerald-800',
  // Fund types
  restricted: 'bg-red-100 text-red-700',
  unrestricted: 'bg-green-100 text-green-700',
  temporarily_restricted: 'bg-yellow-100 text-yellow-700',
  endowment: 'bg-purple-100 text-purple-700',
  // Budget types
  operational: 'bg-emerald-100 text-emerald-800',
  project: 'bg-green-100 text-green-700',
  departmental: 'bg-purple-100 text-purple-700',
  consolidated: 'bg-orange-100 text-orange-700',
}

export function getStatusColor(status: string): string {
  return statusColors[status] || 'bg-gray-100 text-gray-700'
}

// Generic status labels
const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending',
  pending_approval: 'Pending Approval',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  active: 'Active',
  inactive: 'Inactive',
  closed: 'Closed',
  completed: 'Completed',
  posted: 'Posted',
  on_hold: 'On Hold',
  suspended: 'Suspended',
  planning: 'Planning',
  restricted: 'Restricted',
  unrestricted: 'Unrestricted',
  temporarily_restricted: 'Temporarily Restricted',
  endowment: 'Endowment',
  operational: 'Operational',
  project: 'Project',
  departmental: 'Departmental',
  consolidated: 'Consolidated',
}

export function getStatusLabel(status: string): string {
  return statusLabels[status] || status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')
}

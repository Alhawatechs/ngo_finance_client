/**
 * Shared sector options for Organization setup and as fallback when organization
 * has not yet set sectors_of_operation. Used by:
 * - Admin → Organization Setup (when adding sectors to the license)
 * - Projects (sector filter and project form) when org sectors are empty
 */
export const DEFAULT_SECTOR_OPTIONS: readonly string[] = [
  'Health',
  'Education',
  'Agriculture',
  'Water & Sanitation',
  'Food Security',
  'Livelihood',
  'Livelihoods',
  'Emergency Response',
  'Women Empowerment',
  'Child Protection',
  'Disability',
  'Human Rights',
  'Environment',
  'Climate Change',
  'Shelter',
  'Refugees & IDPs',
  'Peacebuilding',
  'Governance',
  'Economic Development',
  'Protection',
  'WASH',
  'Multi-Sector',
  'Other',
]

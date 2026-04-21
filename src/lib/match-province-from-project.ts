/**
 * Match coding-block province code from project office / location fields (voucher coding block).
 */
export function matchProvinceCodeFromProject(
  proj:
    | {
        location?: string | null
        locations?: string[] | null
        locations_list?: string[]
        office?: { name?: string; province?: string; code?: string }
      }
    | undefined,
  provinces: Array<{ name: string; code: string }>
): string | null {
  if (!proj || !provinces.length) return null
  const candidates: string[] = []
  if (proj.office?.province) candidates.push(proj.office.province)
  if (proj.location) candidates.push(proj.location)
  if (proj.locations_list?.length) candidates.push(...proj.locations_list)
  if (proj.locations?.length) candidates.push(...proj.locations)
  for (const raw of candidates) {
    const c = raw.trim().toLowerCase()
    if (!c) continue
    for (const pr of provinces) {
      const n = pr.name.toLowerCase()
      if (c === n || c.includes(n) || n.includes(c)) {
        return pr.code
      }
    }
  }
  return null
}

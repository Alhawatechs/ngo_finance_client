import apiClient from './client'

// Types
export interface OrganizationalUnit {
  id: number
  name: string
  code?: string
  type: 'division' | 'department' | 'unit' | 'section' | 'team'
  description?: string
  head_title?: string
  head_user_id?: number
  parent_id?: number
  level: number
  sort_order: number
  color?: string
  is_active: boolean
  parent?: OrganizationalUnit
  head?: { id: number; name: string; avatar?: string }
  children?: OrganizationalUnit[]
  positions_count?: number
  staff_count?: number
}

export interface Position {
  id: number
  title: string
  code?: string
  organizational_unit_id?: number
  reports_to_id?: number
  level: 'executive' | 'senior_management' | 'middle_management' | 'supervisory' | 'professional' | 'support'
  description?: string
  responsibilities?: string
  qualifications?: string
  grade?: number
  headcount: number
  min_salary?: number
  max_salary?: number
  is_supervisory: boolean
  is_active: boolean
  sort_order: number
  organizational_unit?: OrganizationalUnit
  reports_to?: Position
  holder?: {
    id: number
    name: string
    avatar?: string
    is_acting: boolean
  }
  direct_reports?: PositionNode[]
  is_vacant?: boolean
}

export interface PositionNode {
  id: number
  title: string
  code?: string
  level: string
  department?: string
  department_id?: number
  is_supervisory: boolean
  is_vacant: boolean
  holder?: {
    id: number
    name: string
    avatar?: string
    is_acting: boolean
  }
  direct_reports: PositionNode[]
}

export interface PositionAssignment {
  id: number
  position_id: number
  user_id: number
  start_date: string
  end_date?: string
  is_primary: boolean
  is_acting: boolean
  employment_type: 'full_time' | 'part_time' | 'contract'
  is_active: boolean
  position?: Position
  user?: { id: number; name: string }
}

export interface SegregationOfDuties {
  id: number
  name: string
  description?: string
  rule_type: 'incompatible_positions' | 'incompatible_functions' | 'approval_separation' | 'custom'
  position_a_id?: number
  position_b_id?: number
  function_a?: string
  function_b?: string
  severity: 'warning' | 'block'
  is_active: boolean
  position_a?: Position
  position_b?: Position
}

export interface ReportingLine {
  id: number
  subordinate_position_id: number
  supervisor_position_id: number
  relationship_type: 'direct' | 'dotted' | 'functional' | 'project'
  description?: string
  is_primary: boolean
  is_active: boolean
  subordinate_position?: Position
  supervisor_position?: Position
}

export interface OrganogramData {
  units: OrganizationalUnit[]
  positions: PositionNode[]
  statistics: {
    total_units: number
    total_positions: number
    filled_positions: number
    vacant_positions: number
  }
}

// API Functions
export async function getOrganogram(): Promise<{ data: OrganogramData }> {
  const response = await apiClient.get('/organogram')
  return response.data
}

export async function getUnits(): Promise<{ data: OrganizationalUnit[] }> {
  const response = await apiClient.get('/organogram/units')
  return response.data
}

export async function createUnit(data: Partial<OrganizationalUnit>): Promise<{ data: OrganizationalUnit; message: string }> {
  const response = await apiClient.post('/organogram/units', data)
  return response.data
}

export async function updateUnit(id: number, data: Partial<OrganizationalUnit>): Promise<{ data: OrganizationalUnit; message: string }> {
  const response = await apiClient.put(`/organogram/units/${id}`, data)
  return response.data
}

export async function deleteUnit(id: number): Promise<{ message: string }> {
  const response = await apiClient.delete(`/organogram/units/${id}`)
  return response.data
}

export async function getPositions(): Promise<{ data: Position[] }> {
  const response = await apiClient.get('/organogram/positions')
  return response.data
}

export async function createPosition(data: Partial<Position>): Promise<{ data: Position; message: string }> {
  const response = await apiClient.post('/organogram/positions', data)
  return response.data
}

export async function updatePosition(id: number, data: Partial<Position>): Promise<{ data: Position; message: string }> {
  const response = await apiClient.put(`/organogram/positions/${id}`, data)
  return response.data
}

export async function deletePosition(id: number): Promise<{ message: string }> {
  const response = await apiClient.delete(`/organogram/positions/${id}`)
  return response.data
}

export async function assignUser(data: {
  position_id: number
  user_id: number
  start_date: string
  end_date?: string
  is_primary?: boolean
  is_acting?: boolean
  employment_type?: string
}): Promise<{ data: PositionAssignment; message: string }> {
  const response = await apiClient.post('/organogram/assignments', data)
  return response.data
}

export async function unassignUser(assignmentId: number): Promise<{ message: string }> {
  const response = await apiClient.delete(`/organogram/assignments/${assignmentId}`)
  return response.data
}

export async function getSodRules(): Promise<{ data: SegregationOfDuties[] }> {
  const response = await apiClient.get('/organogram/sod-rules')
  return response.data
}

export async function createSodRule(data: Partial<SegregationOfDuties>): Promise<{ data: SegregationOfDuties; message: string }> {
  const response = await apiClient.post('/organogram/sod-rules', data)
  return response.data
}

export async function deleteSodRule(id: number): Promise<{ message: string }> {
  const response = await apiClient.delete(`/organogram/sod-rules/${id}`)
  return response.data
}

export async function getReportingLines(): Promise<{ data: ReportingLine[] }> {
  const response = await apiClient.get('/organogram/reporting-lines')
  return response.data
}

export async function createReportingLine(data: Partial<ReportingLine>): Promise<{ data: ReportingLine; message: string }> {
  const response = await apiClient.post('/organogram/reporting-lines', data)
  return response.data
}

export async function deleteReportingLine(id: number): Promise<{ message: string }> {
  const response = await apiClient.delete(`/organogram/reporting-lines/${id}`)
  return response.data
}

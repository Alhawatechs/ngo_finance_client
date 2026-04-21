import type { FormatSheet } from '@/components/budget/ColumnDefinitionEditor'

/** UNICEF HER Project Budget – columns aligned with standard HER format (section, item, CSO, UNICEF, total, amendment, remark, units, Q1–Q4) */
export const UNICEF_HER_PRESET: FormatSheet = {
  key: '0',
  name: 'Main',
  columns: [
    { key: 'section_code', label: 'Section', type: 'select', required: false, computed: '' },
    { key: 'item_description', label: 'Item Description', type: 'text', required: true, computed: '' },
    { key: 'cso_contribution', label: 'CSO Contribution (USD)', type: 'currency', required: false, computed: '' },
    { key: 'unicef_contribution', label: 'UNICEF Contribution (USD)', type: 'currency', required: false, computed: '' },
    { key: 'total_amount', label: 'Total (USD)', type: 'currency', required: false, computed: 'cso_contribution+unicef_contribution' },
    { key: 'amend_amount', label: 'Amendment', type: 'currency', required: false, computed: '' },
    { key: 'remark', label: 'Remark', type: 'text', required: false, computed: '' },
    { key: 'unit_type', label: 'Unit type', type: 'text', required: false, computed: '' },
    { key: 'quantity', label: 'Number of units', type: 'number', required: false, computed: '' },
    { key: 'unit_cost', label: 'Unit cost', type: 'currency', required: false, computed: '' },
    { key: 'q1_amount', label: 'Q1', type: 'currency', required: false, computed: '' },
    { key: 'q2_amount', label: 'Q2', type: 'currency', required: false, computed: '' },
    { key: 'q3_amount', label: 'Q3', type: 'currency', required: false, computed: '' },
    { key: 'q4_amount', label: 'Q4', type: 'currency', required: false, computed: '' },
  ],
}

/** UNFPA / WHO Standard Categories – columns for donor reporting */
export const UNFPA_WHO_PRESET: FormatSheet = {
  key: '0',
  name: 'Main',
  columns: [
    { key: 'category_code', label: 'Code', type: 'select', required: false, computed: '' },
    { key: 'budget_line_description', label: 'Budget Line Description', type: 'text', required: true, computed: '' },
    { key: 'unit_description', label: 'Unit Description', type: 'text', required: false, computed: '' },
    { key: 'quantity', label: 'Quantity', type: 'number', required: false, computed: '' },
    { key: 'unit_cost', label: 'Unit Cost', type: 'currency', required: false, computed: '' },
    { key: 'duration_recurrence', label: 'Duration/Recurrence', type: 'text', required: false, computed: '' },
    { key: 'cost_pct', label: '% Cost', type: 'number', required: false, computed: '' },
    { key: 'total_cost', label: 'Total Cost', type: 'currency', required: false, computed: 'quantity*unit_cost*(cost_pct/100)' },
    { key: 'budget_narrative', label: 'Budget Narrative', type: 'textarea', required: false, computed: '' },
    { key: 'remarks', label: 'Remarks', type: 'text', required: false, computed: '' },
    { key: 'location', label: 'Location of position', type: 'text', required: false, computed: '' },
  ],
}

/** Legacy – account + Q1–Q4 + annual */
export const LEGACY_PRESET: FormatSheet = {
  key: '0',
  name: 'Main',
  columns: [
    { key: 'account_id', label: 'Account', type: 'account_picker', required: true, computed: '' },
    { key: 'description', label: 'Description', type: 'text', required: false, computed: '' },
    { key: 'q1_amount', label: 'Q1', type: 'currency', required: false, computed: '' },
    { key: 'q2_amount', label: 'Q2', type: 'currency', required: false, computed: '' },
    { key: 'q3_amount', label: 'Q3', type: 'currency', required: false, computed: '' },
    { key: 'q4_amount', label: 'Q4', type: 'currency', required: false, computed: '' },
    { key: 'annual_amount', label: 'Annual', type: 'currency', required: false, computed: 'q1_amount+q2_amount+q3_amount+q4_amount' },
  ],
}

export const FORMAT_PRESETS = [
  { id: 'none', name: 'Start from scratch', sheets: [] as FormatSheet[] },
  { id: 'unicef_her', name: 'UNICEF HER Project Budget', structure_type: 'activity_based' as const, sheets: [UNICEF_HER_PRESET] },
  { id: 'unfpa_who', name: 'UNFPA / WHO Standard Categories', structure_type: 'donor_code_based' as const, sheets: [UNFPA_WHO_PRESET] },
  { id: 'legacy', name: 'Legacy (Account + Q1–Q4)', structure_type: 'account_based' as const, sheets: [LEGACY_PRESET] },
] as const

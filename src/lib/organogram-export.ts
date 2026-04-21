/**
 * Organogram export utilities: Word (.docx), Excel (.xlsx), PDF (.pdf)
 * Supports organization logo and organization chart (hierarchy).
 */
import * as XLSX from 'xlsx'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  BorderStyle,
  WidthType,
  ImageRun,
  AlignmentType,
  PageOrientation,
} from 'docx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { OrganizationalUnit, Position, PositionNode, SegregationOfDuties } from '@/lib/api/organogram'

const levelLabels: Record<string, string> = {
  executive: 'Executive',
  senior_management: 'Senior Management',
  middle_management: 'Middle Management',
  supervisory: 'Supervisory',
  professional: 'Professional',
  support: 'Support Staff',
}

function flattenUnitsWithParent(
  units: OrganizationalUnit[],
  parentName = ''
): { name: string; code: string; type: string; parent: string; level: number }[] {
  const result: { name: string; code: string; type: string; parent: string; level: number }[] = []
  for (const u of units) {
    result.push({
      name: u.name,
      code: u.code ?? '',
      type: u.type,
      parent: parentName,
      level: u.level ?? 0,
    })
    if (u.children?.length) {
      result.push(...flattenUnitsWithParent(u.children, u.name))
    }
  }
  return result
}

/** Flatten organization chart tree to rows with depth for hierarchy display */
function flattenChartTree(
  nodes: PositionNode[],
  depth = 0
): { depth: number; title: string; department: string; level: string; holder: string; status: string }[] {
  const result: { depth: number; title: string; department: string; level: string; holder: string; status: string }[] = []
  for (const node of nodes) {
    result.push({
      depth,
      title: node.title,
      department: node.department ?? '',
      level: levelLabels[node.level] ?? node.level,
      holder: node.holder?.name ?? '',
      status: node.is_vacant ? 'Vacant' : 'Filled',
    })
    if (node.direct_reports?.length) {
      result.push(...flattenChartTree(node.direct_reports, depth + 1))
    }
  }
  return result
}

/** Parse data URL to get mime type and Uint8Array (for docx image) */
function parseDataUrl(dataUrl: string): { type: 'png' | 'jpeg' | 'gif'; data: Uint8Array } | null {
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|gif);base64,(.+)$/i)
  if (!match) return null
  const mime = match[1].toLowerCase()
  const type = mime === 'jpg' ? 'jpeg' : (mime as 'png' | 'jpeg' | 'gif')
  try {
    const binary = atob(match[2])
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return { type, data: bytes }
  } catch {
    return null
  }
}

export interface OrganogramExportData {
  units: OrganizationalUnit[]
  positions: Position[]
  sodRules: SegregationOfDuties[]
  statistics: {
    total_units: number
    total_positions: number
    filled_positions: number
    vacant_positions: number
  }
  /** Organization name for header */
  organizationName?: string
  /** Logo as base64 data URL (e.g. from fetch + readAsDataURL) for PDF/Word */
  logoDataUrl?: string | null
  /** Root nodes of the org chart tree (for Excel table / fallback) */
  chartTree?: PositionNode[]
  /** Chart rendered as image (logo + boxes + lines) for Word/PDF — matches on-screen visual */
  chartImageDataUrl?: string | null
}

/** Export Organization Chart only to Excel (.xlsx) — one sheet: Organization Chart */
export function exportToExcel(data: OrganogramExportData, filename = 'Organization_Chart.xlsx'): void {
  const wb = XLSX.utils.book_new()

  const chartRows = data.chartTree?.length ? flattenChartTree(data.chartTree) : []
  const chartData = [
    ...(data.organizationName ? [[data.organizationName, '', '', '', '', ''], ['Organization Chart', '', '', '', '', ''], []] : []),
    ['Level', 'Position', 'Department', 'Level (Grade)', 'Holder', 'Status'],
    ...chartRows.map((r) => [
      r.depth,
      '  '.repeat(r.depth) + r.title,
      r.department,
      r.level,
      r.holder,
      r.status,
    ]),
  ]
  const wsChart = XLSX.utils.aoa_to_sheet(chartData)
  XLSX.utils.book_append_sheet(wb, wsChart, 'Organization Chart')

  XLSX.writeFile(wb, filename)
}

/** Export Organization Chart only to Word (.docx) — visual chart image (logo + boxes + lines) or table fallback */
export async function exportToWord(data: OrganogramExportData, filename = 'Organization_Chart.docx'): Promise<void> {
  const children: (Paragraph | Table)[] = []

  if (data.chartImageDataUrl) {
    const parsed = parseDataUrl(data.chartImageDataUrl)
    if (parsed) {
      try {
        const chartImg = new ImageRun({
          type: (parsed.type === 'jpeg' ? 'jpg' : parsed.type) as 'png' | 'gif' | 'jpg',
          data: parsed.data,
          transformation: { width: 680, height: 450 },
        })
        children.push(new Paragraph({ children: [chartImg], alignment: AlignmentType.CENTER, spacing: { after: 200 } }))
      } catch (_) {
        // fallback to logo + title + table below
      }
    }
  }
  if (!data.chartImageDataUrl) {
    if (data.logoDataUrl) {
      const parsed = parseDataUrl(data.logoDataUrl)
      if (parsed) {
        try {
          const imageRun = new ImageRun({
            type: (parsed.type === 'jpeg' ? 'jpg' : parsed.type) as 'png' | 'gif' | 'jpg',
            data: parsed.data,
            transformation: { width: 120, height: 120 },
          })
          children.push(new Paragraph({ children: [imageRun], alignment: AlignmentType.CENTER, spacing: { after: 200 } }))
        } catch (_) {}
      }
    }
    children.push(
      new Paragraph({
        text: data.organizationName ? `${data.organizationName} — Organization Chart` : 'Organization Chart',
        heading: HeadingLevel.TITLE,
        spacing: { after: 400 },
      })
    )
  }
  if (!data.chartImageDataUrl && data.chartTree?.length) {
    const chartRows = flattenChartTree(data.chartTree)
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
        },
        rows: [
          new TableRow({
            children: ['Level', 'Position', 'Department', 'Level (Grade)', 'Holder', 'Status'].map((h) =>
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] })
            ),
          }),
          ...chartRows.map((r) =>
            new TableRow({
              children: [
                String(r.depth),
                '  '.repeat(r.depth) + r.title,
                r.department,
                r.level,
                r.holder,
                r.status,
              ].map((t) =>
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(t) })] })] })
              ),
            })
          ),
        ],
      })
    )
  } else if (!data.chartImageDataUrl) {
    children.push(
      new Paragraph({
        text: 'No organization chart data.',
        spacing: { after: 200 },
      })
    )
  }

  const useLandscape = !!data.chartImageDataUrl
  const doc = new Document({
    sections: [{
      properties: useLandscape ? { page: { size: { orientation: PageOrientation.LANDSCAPE } } } : {},
      children,
    }],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Export organogram to PDF — landscape when exporting chart image for better fit */
export function exportToPdf(data: OrganogramExportData, filename = 'Organization_Chart.pdf'): void {
  const useLandscape = !!data.chartImageDataUrl
  const doc = new jsPDF({
    orientation: useLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  })
  let y = 15
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14

  if (data.chartImageDataUrl) {
    try {
      const format = data.chartImageDataUrl.startsWith('data:image/jpeg') || data.chartImageDataUrl.startsWith('data:image/jpg')
        ? 'JPEG'
        : 'PNG'
      const imgW = pageWidth - 2 * margin
      const imgH = pageHeight - 2 * margin
      doc.addImage(data.chartImageDataUrl, format, margin, margin, imgW, imgH)
    } catch (_) {
      // fallback to logo + title + table
    }
  } else {
    if (data.logoDataUrl) {
      try {
        const imgW = 25
        const imgH = 25
        const format = data.logoDataUrl.startsWith('data:image/jpeg') || data.logoDataUrl.startsWith('data:image/jpg')
          ? 'JPEG'
          : 'PNG'
        doc.addImage(data.logoDataUrl, format, (pageWidth - imgW) / 2, y, imgW, imgH)
        y += imgH + 6
      } catch (_) {}
    }
    doc.setFontSize(18)
    const title = data.organizationName ? `${data.organizationName} — Organization Chart` : 'Organization Chart'
    doc.text(title, margin, y)
    y += 12
  }

  if (!data.chartImageDataUrl && data.chartTree?.length) {
    const chartRows = flattenChartTree(data.chartTree)
    autoTable(doc, {
      startY: y,
      head: [['Level', 'Position', 'Department', 'Grade', 'Holder', 'Status']],
      body: chartRows.map((r) => [
        String(r.depth),
        '  '.repeat(r.depth) + r.title,
        r.department,
        r.level,
        r.holder,
        r.status,
      ]),
      theme: 'grid',
      margin: { left: margin, right: margin },
    })
  } else if (!data.chartImageDataUrl) {
    doc.setFontSize(10)
    doc.text('No organization chart data.', margin, y)
  }

  doc.save(filename)
}

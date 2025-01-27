import jsPDF from 'jspdf'
import {
  CellTextPartInput,
  CustomTableInputSyntax,
  RowInput,
  UserOptions,
} from './config'
import autoTable from './main'
import { CustomCellText, CustomCellTextLine } from './models'

type CustomCellTextGrid = CustomCellText[][] // Multi-row, multi-column

type InputFormat = 'normal' | 'custom'
function classifyInput(data: CustomTableInputSyntax | RowInput[]): InputFormat {
  if (
    data.every((row) => {
      if (Array.isArray(row)) {
        row.every((cell) => {
          return typeof cell === 'string' || typeof cell === 'object'
        })
      }

      return false
    })
  ) {
    return 'custom'
  }

  return 'normal'
}

/**
 * Converts decorator syntax into the syntax used by the drawTable function
 */
function parseBodyToCompat<Format extends InputFormat>(
  format: Format,
  data: Format extends 'normal' ? RowInput[] : CustomTableInputSyntax,
): RowInput[] {
  if (format === 'normal') {
    return data as RowInput[]
  }

  return (data as CustomTableInputSyntax).map((row) => {
    return row.map((cell) => {
      if (Array.isArray(cell)) {
        return cell.map((cell) => {
          return typeof cell === 'object' ? cell.text : cell
        })
      } else {
        return typeof cell === 'object' ? cell.text : cell
      }
    })
  })
}

/**
 * Parses a part of text within a cell and converts into a custom cell object
 */
function parsePart(part: CellTextPartInput): CustomCellTextLine {
  const splitter = /(\r\n|\r|\n)/g

  let parts: CustomCellTextLine
  if (typeof part === 'string') {
    parts = part.split(splitter).map((line) => ({ text: line }))
  } else {
    parts = part.text.split(splitter).map((line) => ({
      text: line,
      effect: part.effect,
      script: part.script,
    }))
  }

  return parts.filter((p) => p.text.trim().length > 0)
}

/**
 * Normalize (string | object) cells to just object type
 * @param styledData
 * @returns
 */
function normalizeCustomCellStyles(
  styledData: CustomTableInputSyntax,
): CustomCellTextGrid {
  // Multi-row, multi-column
  return styledData.map((row) => {
    return row.map((cell) => {
      const lines: CustomCellText = []

      const cellNormalized = Array.isArray(cell) ? cell : [cell]

      let currentLine: CustomCellTextLine = []
      cellNormalized.forEach((part) => {
        // Returns line-breaks as separate parts
        const processed = parsePart(part)
        if (processed.length === 0) throw Error('Bad')

        processed.forEach((processedPart, i) => {
          if (i !== 0) {
            lines.push(currentLine)
            currentLine = []
          }
          currentLine.push(processedPart)
        })
      })
      lines.push(currentLine)

      return lines
    })
  })
}

export function parseContentSection(
  section?: RowInput[] | CustomTableInputSyntax,
):
  | {
      compat: RowInput[]
      customStyles?: CustomCellTextGrid
    }
  | undefined {
  if (!section) return undefined

  const format = classifyInput(section)

  const rowInput = parseBodyToCompat(format, section)

  if (format === 'custom') {
    return {
      compat: rowInput,
      customStyles: normalizeCustomCellStyles(
        section as CustomTableInputSyntax,
      ),
    }
  } else {
    return {
      compat: rowInput,
    }
  }
}

export function delimitDataByPage(
  submitOptions: UserOptions,
  autoTableCb: typeof autoTable,
) {
  const tmpDoc = new jsPDF()

  const firstLastElPerPage: { min: number; max: number }[] = []
  let currentBounds = { page: 0, min: 0, max: Infinity }

  autoTableCb(tmpDoc, {
    ...submitOptions,
    didDrawCell: (data) => {
      if (submitOptions.didDrawCell) submitOptions.didDrawCell(data)

      if (currentBounds.page !== data.pageNumber) {
        if (currentBounds.page !== 0) {
          firstLastElPerPage.push({
            min: currentBounds.min,
            max: currentBounds.max,
          })
        }
        currentBounds = {
          page: data.pageNumber,
          min: data.row.index,
          max: data.row.index,
        }
      } else {
        if (data.row.index > currentBounds.max)
          currentBounds.max = data.row.index
      }
    },
  })

  firstLastElPerPage.push({ min: currentBounds.min, max: currentBounds.max })
  return firstLastElPerPage
}

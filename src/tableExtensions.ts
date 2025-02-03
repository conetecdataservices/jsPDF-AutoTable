// Custom table extensions for jsPDF-AutoTable, including support for text decorators and drawing by page
// Also includes a new custom data format to make text decorators easier to use

import jsPDF from 'jspdf'
import {
  CellTextPartInput,
  CustomTableInputSyntax,
  RowInput,
  UserOptions,
} from './config'
import { CellHook, CustomCellText, CustomCellTextLine } from './models'
import { jsPDFDocument } from './documentHandler'
import { drawTable as _drawTable } from './tableDrawer'
import { createTable as _createTable } from './tableCalculator'
import { parseInput } from './inputParser'

export function doAutoTable(d: jsPDFDocument, options: UserOptions) {
  const input = parseInput(d, options)
  const table = _createTable(d, input)
  _drawTable(d, table)
}

type CustomCellTextGrid = CustomCellText[][] // Multi-row, multi-column

type InputFormat = 'normal' | 'custom'
function classifyInput(data: CustomTableInputSyntax): 'custom'
function classifyInput(data: RowInput[]): 'normal'
function classifyInput(data: RowInput[] | CustomTableInputSyntax): InputFormat
function classifyInput(data: RowInput[] | CustomTableInputSyntax): InputFormat {
  if (
    data.some((row) => {
      if (Array.isArray(row)) {
        return row.some((cell) => {
          const normalized = Array.isArray(cell) ? cell : [cell]

          return normalized.some((cellPart) => {
            return (
              cellPart !== null &&
              typeof cellPart === 'object' &&
              'text' in cellPart
            )
          })
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

  return (
    parts
      // Remove malformed parts (empty strings)
      .filter((p) => p.text)
      // Remove newline markers, as that is now represented as an array
      .map((p) => (p.text.match(splitter) ? { ...p, text: '' } : p))
  )
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

type ParsedContentSection = {
  compat: RowInput[]
  customStyles?: CustomCellTextGrid
}
export function parseContentSection(
  section?: RowInput[] | CustomTableInputSyntax,
): ParsedContentSection | undefined {
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

type CustomStyleContentSections = {
  head?: CustomCellTextGrid
  body?: CustomCellTextGrid
  foot?: CustomCellTextGrid
}
export function makeContentConverterHook(
  contentSections?: CustomStyleContentSections,
): CellHook {
  return (data) => {
    if (data.section === 'head' && contentSections?.head) {
      data.cell.text = contentSections.head[data.row.index][data.column.index]
    } else if (data.section === 'body' && contentSections?.body) {
      data.cell.text = contentSections.body[data.row.index][data.column.index]
    } else if (data.section === 'foot' && contentSections?.foot) {
      data.cell.text = contentSections.foot[data.row.index][data.column.index]
    }
  }
}

export function delimitDataByPage(submitOptions: UserOptions) {
  const tmpDoc = new jsPDF()

  const firstLastElPerPage: { min: number; max: number }[] = []
  let currentBounds = { page: 0, min: 0, max: Infinity }

  doAutoTable(tmpDoc, {
    ...submitOptions,
    didDrawCell: (data) => {
      if (submitOptions.didDrawCell) submitOptions.didDrawCell(data)

      if (data.row.section !== 'body') return

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

export function drawSinglePageContent(
  d: jsPDFDocument,
  options: UserOptions,
  contentSections: CustomStyleContentSections,
  bounds: { min: number; max: number },
  pageNumber: number,
  totalPages: number,
) {
  // Get page position
  let pagePosition: 'start' | 'middle' | 'end'
  if (pageNumber === 0) {
    pagePosition = 'start'
  } else if (pageNumber === totalPages - 1) {
    pagePosition = 'end'
  } else {
    pagePosition = 'middle'
  }

  const bodyContentToDraw = options.body?.slice(bounds.min, bounds.max + 1)

  const bodyReplacementContent = contentSections.body?.slice(
    bounds.min,
    bounds.max + 1,
  )
  const headReplacementContent = contentSections.head?.slice(
    bounds.min,
    bounds.max + 1,
  )
  const footReplacementContent = contentSections.foot?.slice(
    bounds.min,
    bounds.max + 1,
  )

  let showHead = false
  let showFoot = false
  switch (pagePosition) {
    case 'start':
      if (options.showHead === 'everyPage') showHead = true
      if (options.showFoot === 'everyPage') showFoot = true

      if (options.showHead === 'firstPage') showHead = true
      break
    case 'middle':
      if (options.showHead === 'everyPage') showHead = true
      if (options.showFoot === 'everyPage') showFoot = true
      break
    case 'end':
      if (options.showHead === 'everyPage') showHead = true
      if (options.showFoot === 'everyPage') showFoot = true

      if (options.showFoot === 'lastPage') showFoot = true
      break
  }

  doAutoTable(d, {
    ...options,
    body: bodyContentToDraw,
    showHead,
    showFoot,

    willDrawCell: (data) => {
      if (options.willDrawCell) options.willDrawCell(data)

      makeContentConverterHook({
        head: headReplacementContent,
        body: bodyReplacementContent,
        foot: footReplacementContent,
      })(data)
    },
  })
}

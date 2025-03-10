import {
  CellTextPartInput,
  CustomTableInputSyntax,
  RowInput,
  UserOptions,
} from '../config'
import { CustomCellText, CustomCellTextLine } from '../models'

export type CustomCellTextGrid = CustomCellText[][] // Multi-row, multi-column

type InputFormat = 'normal' | 'custom'
export function classifyTableInput(data: CustomTableInputSyntax): 'custom'
export function classifyTableInput(data: RowInput[]): 'normal'
export function classifyTableInput(
  data: RowInput[] | CustomTableInputSyntax,
): InputFormat
/**
 * Determines if the input format is the base JSPDF-autotable format, or the custom format created in this fork
 * @param data
 * @returns
 */
export function classifyTableInput(
  data: RowInput[] | CustomTableInputSyntax,
): InputFormat {
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
export function parseTableInputToCompat<Format extends InputFormat>(
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

  // Remove newline entries
  // Keep newlines up to the first proper text content so that text like "\n\ntest" works as expected
  const filtered: CustomCellTextLine = []
  let realContentFound = false
  parts
    .filter((p) => p.text !== '')
    .forEach((p) => {
      const pFilt = p.text.replace(splitter, '')
      if (pFilt.length === 0) {
        if (!realContentFound) filtered.push({ text: pFilt })
      } else {
        realContentFound = true //
        filtered.push({
          ...p,
          text: pFilt,
        })
      }
    })

  return filtered
}

/**
 * Normalize (string | object) cells to just object type
 * @param styledData
 * @returns
 */
export function normalizeCustomCellStyles(
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

export interface PageAppearanceBodyRowCapacities {
  bodyOnly: number
  head: number
  foot: number
  headFoot: number
}

export type PagePosition = 'first' | 'middle' | 'last'
/**
 * Gets the number of body rows that can fit on a certain page based on its position (first, middle, last page)
 */
export function getCapacityFigureForPage(
  capacities: PageAppearanceBodyRowCapacities,
  userOptions: UserOptions,
  pagePosition: PagePosition | 'onePage',
): number {
  // Adjust showHead and showFoot based on pagePosition
  const yesHead =
    userOptions.showHead === 'everyPage' ||
    (userOptions.showHead === 'firstPage' &&
      (pagePosition === 'first' || pagePosition === 'onePage'))
  const yesFoot =
    userOptions.showFoot === 'everyPage' ||
    (userOptions.showFoot === 'lastPage' &&
      (pagePosition === 'last' || pagePosition === 'onePage'))

  if (yesHead && yesFoot) {
    return capacities.headFoot
  }

  // else
  if (yesHead) {
    return capacities.head
  }

  // else
  if (yesFoot) {
    return capacities.foot
  }

  // else
  return capacities.bodyOnly
}

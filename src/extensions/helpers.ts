import {
  CellDef,
  CellInput,
  CellTextPartInput,
  RowInput,
  UserOptions,
} from '../config'
import { CustomCellText, CustomCellTextLine } from '../models'

export function cellIsCellDefType(cell: CellInput): cell is CellDef {
  return typeof cell === 'object' && !Array.isArray(cell) && cell !== null
}

/**
 * Converts decorator syntax into the syntax used by the base drawTable function
 */
export function convertCustomCellContentToString(data: CustomCellText): string {
  // Reintroduce line breaks so that AutoTable does the correct cell height and width calculations
  return data
    .flatMap((line) => {
      return line.map((part) => part.text).join()
    })
    .join('\n')
}

/**
 * Parses a part of text within a cell and converts into a custom cell object
 *
 * Edits in-place
 */
function parsePart(
  part: CellTextPartInput | CustomCellTextLine,
): CustomCellTextLine {
  const splitter = /(\r\n|\r|\n)/g

  if (Array.isArray(part)) return part

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
 * Interprets custom content syntax within the section input and processes it
 *
 * Edits in-place
 */
export function preprocessContentSection(sectionInput?: RowInput[]): void {
  if (!sectionInput) return

  // Multi-row, multi-column
  sectionInput.forEach((row) => {
    // Only touch the custom content property, ignore everything else

    if (Array.isArray(row)) {
      row.forEach((cell) => {
        if (cellIsCellDefType(cell) && cell.customContentSyntax !== undefined) {
          // CellDef type only
          const customSyntax = cell.customContentSyntax
          const lines: CustomCellText = []

          const cellNormalized = Array.isArray(customSyntax)
            ? customSyntax
            : [customSyntax]

          let currentLine: CustomCellTextLine = []
          cellNormalized?.forEach((part) => {
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

          cell.customContentSyntax = lines
          cell.content = convertCustomCellContentToString(lines)
        }
      })
    }
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

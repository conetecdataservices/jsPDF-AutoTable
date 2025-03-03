// Custom table extensions for jsPDF-AutoTable, including support for text decorators and drawing by page
// Also includes a new custom data format to make text decorators easier to use

import jsPDF, { jsPDFOptions } from 'jspdf'
import { CustomTableInputSyntax, RowInput, UserOptions } from '../config'
import { CellHook } from '../models'
import { jsPDFDocument } from '../documentHandler'
import { drawTable as _drawTable } from '../tableDrawer'
import { createTable as _createTable } from '../tableCalculator'
import { parseInput } from '../inputParser'
import {
  classifyTableInput,
  CustomCellTextGrid,
  getCapacityFigureForPage as getCapacityFigureForPagePosition,
  normalizeCustomCellStyles,
  PageAppearanceBodyRowCapacities,
  PagePosition,
  parseTableInputToCompat,
} from './helpers'

export function doAutoTable(d: jsPDFDocument, options: UserOptions) {
  const input = parseInput(d, options)
  const table = _createTable(d, input)
  _drawTable(d, table)
}

type ParsedContentSection = {
  compat: RowInput[]
  customStyles?: CustomCellTextGrid
}
export function parseContentSection(
  section?: RowInput[] | CustomTableInputSyntax,
): ParsedContentSection | undefined {
  if (!section) return undefined

  const format = classifyTableInput(section)

  const rowInput = parseTableInputToCompat(format, section)

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
    if (data.section === 'head' && contentSections?.head?.length) {
      data.cell.text = contentSections.head[data.row.index][data.column.index]
    } else if (data.section === 'body' && contentSections?.body?.length) {
      data.cell.text = contentSections.body[data.row.index][data.column.index]
    } else if (data.section === 'foot' && contentSections?.foot?.length) {
      data.cell.text = contentSections.foot[data.row.index][data.column.index]
    }
  }
}

/**
 * Determines how many rows of body content can fit on pages of the PDF, based on size and header/footer visibility
 */
function getPageBodyRowsCapacity(
  userOptions: UserOptions,
  jsPDFOptions: jsPDFOptions,
): PageAppearanceBodyRowCapacities {
  const appearanceModifiers = [
    // None
    [false, false],
    // Head
    [true, false],
    // Foot
    [false, true],
    // Head Foot
    [true, true],
  ]
  const body: RowInput[] = []

  const maxRowsPerAppearance = appearanceModifiers.map((modifierSet) => {
    const tmpDoc = new jsPDF(jsPDFOptions)

    let maxRows = 0
    let madeItToPage2 = false
    while (!madeItToPage2) {
      doAutoTable(tmpDoc, {
        ...userOptions,
        body,
        showHead: modifierSet[0],
        showFoot: modifierSet[1],

        didDrawCell: (data) => {
          if (userOptions.didDrawCell) userOptions.didDrawCell(data)

          if (data.row.section !== 'body') return

          if (data.pageNumber > 1) madeItToPage2 = true

          if (data.pageNumber === 1 && data.row.index > maxRows) {
            maxRows = data.row.index
          }
        },
      })

      if (!madeItToPage2) {
        for (let i = 0; i < 100; i++) {
          body.push([i])
        }
      }
    }

    return maxRows
  })

  return {
    bodyOnly: maxRowsPerAppearance[0],
    head: maxRowsPerAppearance[1],
    foot: maxRowsPerAppearance[2],
    headFoot: maxRowsPerAppearance[3],
  }
}

export type PageRowDelimit = { min: number; max: number }
export type PagePositionBodyRowCapacities = Record<
  'first' | 'middle' | 'last',
  number
>

export function delimitDataRowsByPage(
  userOptions: UserOptions,
  jsPDFConstructorOptions: jsPDFOptions,
): {
  pages: PageRowDelimit[]
  capacities: PagePositionBodyRowCapacities
} {
  const capacities = getPageBodyRowsCapacity(
    userOptions,
    jsPDFConstructorOptions,
  )

  const pages: PageRowDelimit[] = []
  const bodyLength = userOptions.body?.length ?? 0

  const pagePositionCapacities: Partial<PagePositionBodyRowCapacities> = {}

  const onePageCapacity = getCapacityFigureForPagePosition(
    capacities,
    userOptions,
    'onePage',
  )

  // Check if one page
  if (bodyLength <= onePageCapacity) {
    pagePositionCapacities['first'] = onePageCapacity
    pagePositionCapacities['middle'] = onePageCapacity
    pagePositionCapacities['last'] = onePageCapacity

    pages.push({
      min: 0,
      max: bodyLength - 1,
    })
  } else {
    pagePositionCapacities['first'] = getCapacityFigureForPagePosition(
      capacities,
      userOptions,
      'first',
    )
    pagePositionCapacities['middle'] = getCapacityFigureForPagePosition(
      capacities,
      userOptions,
      'middle',
    )
    pagePositionCapacities['last'] = getCapacityFigureForPagePosition(
      capacities,
      userOptions,
      'last',
    )

    let traveler = 0
    while (traveler < bodyLength) {
      // Get page position
      const remainingRows = bodyLength - traveler

      let position: PagePosition
      if (traveler === 0) position = 'first'
      else if (remainingRows <= pagePositionCapacities['last']!)
        position = 'last'
      else position = 'middle'

      const capacity = pagePositionCapacities[position]!
      const lastRowThisPage = traveler + capacity - 1

      pages.push({
        max: lastRowThisPage,
        min: traveler,
      })

      traveler = lastRowThisPage + 1
    }
  }

  return {
    pages,
    capacities: pagePositionCapacities as PagePositionBodyRowCapacities,
  }
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

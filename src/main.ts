'use strict'

import _applyPlugin from './applyPlugin'
import { TextDecoratorUserOptions, UserOptions } from './config'
import { jsPDFConstructor, jsPDFDocument } from './documentHandler'
import { parseInput } from './inputParser'
import { drawTable as _drawTable } from './tableDrawer'
import { createTable as _createTable } from './tableCalculator'
import { CellHook, Table } from './models'
import { CellHookData } from './HookData'
import { Cell, Column, Row } from './models'
import { delimitDataByPage, parseContentSection } from './textDecorators'

export type autoTable = (options: UserOptions) => void

// export { applyPlugin } didn't export applyPlugin
// to index.d.ts for some reason
export function applyPlugin(jsPDF: jsPDFConstructor) {
  _applyPlugin(jsPDF)
}

function autoTable(d: jsPDFDocument, options: UserOptions) {
  const input = parseInput(d, options)
  const table = _createTable(d, input)
  _drawTable(d, table)
}

function drawSinglePageContent(
  d: jsPDFDocument,
  options: UserOptions,
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

  const bodyContent = options.body
  const dataToDraw = bodyContent?.slice(bounds.min, bounds.max + 1)

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

  autoTable(d, {
    ...options,
    body: dataToDraw,
    showHead,
    showFoot,
  })
}

/**
 * run autoTable with a custom syntax that supports certain
 * text decoration, such as: bold, italics, and super/subscripts
 *
 * Optionally supports drawing by page
 */
function autoTableWithTextDecorators(
  d: jsPDFDocument,
  options: TextDecoratorUserOptions,
  drawByPage: true,
): { drawNextPage: () => boolean }
function autoTableWithTextDecorators(
  d: jsPDFDocument,
  options: TextDecoratorUserOptions,
  drawByPage?: false,
): void
function autoTableWithTextDecorators(
  d: jsPDFDocument,
  options: TextDecoratorUserOptions,
  drawByPage?: boolean,
): void | { drawNextPage: () => boolean } {
  const headContent = parseContentSection(options.head)
  const bodyContent = parseContentSection(options.body)
  const footContent = parseContentSection(options.foot)

  const contentConverterHook: CellHook = (data) => {
    if (options.willDrawCell) options.willDrawCell(data)

    if (data.section === 'head' && headContent?.customStyles) {
      data.cell.text =
        headContent?.customStyles[data.row.index][data.column.index]
    } else if (data.section === 'body' && bodyContent?.customStyles) {
      data.cell.text =
        bodyContent?.customStyles[data.row.index][data.column.index]
    } else if (data.section === 'foot' && footContent?.customStyles) {
      data.cell.text =
        footContent?.customStyles[data.row.index][data.column.index]
    }
  }

  const submitOptions: UserOptions = {
    ...(options as UserOptions),
    head: headContent?.compat,
    body: bodyContent?.compat,
    foot: footContent?.compat,
    willDrawCell:
      headContent || bodyContent || footContent
        ? contentConverterHook
        : options.willDrawCell,
  }

  if (drawByPage !== true) {
    return autoTable(d, submitOptions)
  }

  // Draw by page
  const pageDelimits = delimitDataByPage(submitOptions, autoTable)
  const iterator = pageDelimits.entries()

  return {
    drawNextPage: () => {
      const pageBounds = iterator.next()

      if (pageBounds.done) return false

      drawSinglePageContent(
        d,
        submitOptions,
        pageBounds.value[1],
        pageBounds.value[0],
        pageDelimits.length,
      )

      return true
    },
  }
}

// Experimental export
export function __createTable(d: jsPDFDocument, options: UserOptions): Table {
  const input = parseInput(d, options)
  return _createTable(d, input)
}

export function __drawTable(d: jsPDFDocument, table: Table) {
  _drawTable(d, table)
}

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  let jsPDF = require('jspdf')
  // Webpack imported jspdf instead of jsPDF for some reason
  // while it seemed to work everywhere else.
  if (jsPDF.jsPDF) jsPDF = jsPDF.jsPDF
  applyPlugin(jsPDF)
} catch (error) {
  // Importing jspdf in nodejs environments does not work as of jspdf
  // 1.5.3 so we need to silence potential errors to support using for example
  // the nodejs jspdf dist files with the exported applyPlugin
}

export default autoTable
export { autoTableWithTextDecorators }
export { CellHookData }
export { Table }
export { Row }
export { Column }
export { Cell }

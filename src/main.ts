'use strict'

import jsPDF from 'jspdf'
import { applyPlugin } from './applyPlugin'
import { UserOptions } from './config'
import { jsPDFDocument } from './documentHandler'
import {
  delimitDataRowsByPage,
  drawSinglePageContent,
  PagePositionBodyRowCapacities,
} from './extensions/tableExtensions'
import { CellHookData, HookData } from './HookData'
import { parseInput } from './inputParser'
import { Cell, Column, Row, Table } from './models'
import { createTable as _createTable } from './tableCalculator'
import { drawTable as _drawTable } from './tableDrawer'
import { preprocessContentSection } from './extensions/helpers'

export type autoTableInstanceType = (options: UserOptions) => void
export { applyPlugin }
export { cellIsCellDefType } from './extensions/helpers'

interface AutoTableBaseParams {
  options: UserOptions
}

interface AutoTableStandardParams extends AutoTableBaseParams {
  drawByPage?: false
  doc: jsPDFDocument
}

interface AutoTableDrawByPageParams extends AutoTableBaseParams {
  /** Whether or not to draw the table one page at a time via a return page iterator function */
  drawByPage: true

  /**
   * A callback which should return an empty jsPDF document with the same styling and options set as the real document
   */
  makeJSPDFDocument: () => jsPDF
}

type PageRowDelimit = { min: number; max: number }
export type DrawByPageMeta = {
  /**
   * Draw the table to the current page in the provided document
   * @returns true if there is another page to draw after this current one, false otherwise
   */
  drawNextPage: (d: jsPDFDocument) => boolean
  /**
   * Indicates the row delimits for each page rendered (inclusive-inclusive)
   */
  pageDelimits: {
    pages: PageRowDelimit[]
    capacities: PagePositionBodyRowCapacities
  }
  /**
   * Modify the row delimits for each page rendered
   */
  modifyDelimits: (newBounds: PageRowDelimit[]) => void
}

function autoTableDrawByPage(args: AutoTableDrawByPageParams): DrawByPageMeta {
  const { makeJSPDFDocument, options } = args

  // Draw by page
  const pageDelimits = delimitDataRowsByPage(options, makeJSPDFDocument)
  let iterator = pageDelimits.pages.entries()

  return {
    pageDelimits,
    modifyDelimits: (newBounds: PageRowDelimit[]) => {
      // TODO, future validation?
      pageDelimits.pages = newBounds
      iterator = pageDelimits.pages.entries()
    },
    drawNextPage: (document) => {
      const pageBounds = iterator.next()

      if (!pageBounds.done) {
        drawSinglePageContent(
          document,
          options,
          pageBounds.value[1],
          pageBounds.value[0],
          pageDelimits.pages.length,
        )
      }

      return !pageBounds.done
    },
  }
}

export function autoTable(args: AutoTableStandardParams): void
export function autoTable(args: AutoTableDrawByPageParams): DrawByPageMeta
export function autoTable(
  args: AutoTableStandardParams | AutoTableDrawByPageParams,
): DrawByPageMeta | void {
  // Create content converters to support custom syntax
  preprocessContentSection(args.options.head)
  preprocessContentSection(args.options.body)
  preprocessContentSection(args.options.foot)

  if (args.drawByPage) {
    return autoTableDrawByPage(args)
  } else {
    const { doc: d, options } = args

    const input = parseInput(d, options)
    const table = _createTable(d, input)
    _drawTable(d, table)
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
  if (typeof window !== 'undefined' && window) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyWindow = window as any
    const jsPDF = anyWindow.jsPDF || anyWindow.jspdf?.jsPDF
    if (jsPDF) {
      applyPlugin(jsPDF)
    }
  }
} catch (error) {
  console.error('Could not apply autoTable plugin', error)
}

export default autoTable
export { Cell, CellHookData, Column, HookData, Row, Table }

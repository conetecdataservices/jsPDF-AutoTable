'use strict'

import { jsPDFOptions } from 'jspdf'
import { applyPlugin } from './applyPlugin'
import { TextDecoratorUserOptions, UserOptions } from './config'
import { jsPDFDocument } from './documentHandler'
import {
  delimitDataRowsByPage,
  drawSinglePageContent,
  makeContentConverterHook,
  PagePositionBodyRowCapacities,
  parseContentSection,
} from './extensions/tableExtensions'
import { CellHookData, HookData } from './HookData'
import { parseInput } from './inputParser'
import { Cell, Column, Row, Table } from './models'
import { createTable as _createTable } from './tableCalculator'
import { drawTable as _drawTable } from './tableDrawer'

export type autoTableInstanceType = (options: UserOptions) => void
export { applyPlugin }

export function autoTable(d: jsPDFDocument, options: UserOptions) {
  const input = parseInput(d, options)
  const table = _createTable(d, input)
  _drawTable(d, table)
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

/**
 * run autoTable with a custom syntax that supports certain
 * text decoration, such as: bold, italics, and super/subscripts
 *
 * Optionally supports drawing by page
 */
function autoTableWithTextDecorators(
  /**
   * Set to true to enable draw-by-page mode
   */
  d: jsPDFDocument,
  options: TextDecoratorUserOptions,
): void
function autoTableWithTextDecorators(
  /**
   * Pass a JsPDF instance to draw the table to the document and disable draw-by-page mode
   */
  drawByPage: true,
  options: TextDecoratorUserOptions,
  jsPDFConstructorOptions: jsPDFOptions,
): DrawByPageMeta
function autoTableWithTextDecorators(
  documentOrDrawByPage: jsPDFDocument | true,
  options: TextDecoratorUserOptions,
  jsPDFConstructorOptions?: jsPDFOptions,
): void | DrawByPageMeta {
  const headContent = parseContentSection(options.head)
  const bodyContent = parseContentSection(options.body)
  const footContent = parseContentSection(options.foot)

  const submitOptions: UserOptions = {
    ...(options as UserOptions),
    head: headContent?.compat,
    body: bodyContent?.compat,
    foot: footContent?.compat,
    willDrawCell: (data) => {
      if (options.willDrawCell) options.willDrawCell(data)

      makeContentConverterHook({
        head: headContent?.customStyles,
        body: bodyContent?.customStyles,
        foot: footContent?.customStyles,
      })(data)
    },
  }

  if (documentOrDrawByPage !== true) {
    return autoTable(documentOrDrawByPage, submitOptions)
  }

  // Draw by page
  const pageDelimits = delimitDataRowsByPage(
    submitOptions,
    jsPDFConstructorOptions!,
  )
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
          submitOptions,
          {
            body: bodyContent?.customStyles,
            head: headContent?.customStyles,
            foot: footContent?.customStyles,
          },
          pageBounds.value[1],
          pageBounds.value[0],
          pageDelimits.pages.length,
        )
      }

      return !pageBounds.done
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
export { autoTableWithTextDecorators }
export { Cell, CellHookData, Column, HookData, Row, Table }

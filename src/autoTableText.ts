import type jsPDF from 'jspdf'
import type { TextOptionsLight } from 'jspdf'
import { jsPDFDocument } from './documentHandler'
import type {
  CustomCellStyle,
  CustomCellText,
  CustomCellTextLine,
} from './models'

type CellText = string | string[] | CustomCellTextLine | CustomCellText

type Positioning = {
  x: number
  y: number
  lineHeight: number
}

function applyCustomCellStyling(
  doc: jsPDF,
  style: CustomCellStyle,
  position: Positioning,
): () => void {
  // Store current font
  const currentFont = doc.getFont()

  if (style.effect) {
    switch (style.effect) {
      case 'bold':
        doc.setFont(currentFont.fontName, 'bold')
        break
      case 'italic':
        doc.setFont(currentFont.fontName, 'italic')
        break
      case 'bolditalic':
        doc.setFont(currentFont.fontName, 'bolditalic')
        break
    }
  }

  // Get current font size
  const currentFontSize = doc.getFontSize()
  const currentY = position.y

  if (style.script) {
    const scriptOffset = currentFontSize / 6
    const sizeOffset = currentFontSize / 3
    doc.setFontSize(currentFontSize - sizeOffset)

    switch (style.script) {
      case 'super':
        position.y -= scriptOffset
        break
      case 'sub':
        position.y += scriptOffset / 3
        break
    }
  }

  // Reverter
  return () => {
    if (style.effect) {
      doc.setFont(currentFont.fontName, currentFont.fontStyle)
    }

    if (style.script) {
      doc.setFontSize(currentFontSize)
      position.y = currentY
    }
  }
}

function iterateCellText(
  doc: jsPDF,
  cellText: CellText,
  positioning: Positioning,
  cb: (
    part: string | CustomCellStyle,
    positioning: Readonly<Positioning>,
  ) => void,
): void {
  if (typeof cellText === 'string') {
    cb(cellText, positioning)
  } else if (
    Array.isArray(cellText) &&
    cellText.every((part) => typeof part === 'string')
  ) {
    cellText.forEach((part, i) => {
      const newPosition = {
        x: positioning.x,
        y: positioning.y + positioning.lineHeight * i,
        lineHeight: positioning.lineHeight,
      }

      cb(part as string | CustomCellStyle, newPosition)
    })
  } else {
    if (Array.isArray(cellText[0])) {
      ;(cellText as CustomCellText).forEach((line, i) => {
        const newPosition = {
          x: positioning.x,
          y: positioning.y + positioning.lineHeight * i,
          lineHeight: positioning.lineHeight,
        }

        iterateCellText(doc, line, newPosition, cb)
      })
    } else {
      ;(cellText as CustomCellTextLine).forEach((part) => {
        const reverter = applyCustomCellStyling(doc, part, positioning)

        cb(part, positioning)
        positioning.x += doc.getTextWidth(part.text)

        reverter()
      })
    }
  }
}

function doThePrint(
  doc: jsPDF,
  text: CellText,
  x: number,
  y: number,
  lineHeight: number,
  options?: TextOptionsLight,
) {
  iterateCellText(doc, text, { x, y, lineHeight }, (part, positioning) => {
    if (typeof part === 'string') {
      doc.text(part, positioning.x, positioning.y, options)
    } else {
      doc.text(part.text, positioning.x, positioning.y, options)
    }
  })
}

function getCellLineUnitWidth(
  doc: jsPDF,
  text: string | CustomCellTextLine,
  x: number,
  y: number,
  lineHeight: number,
  ignoreScripts?: boolean,
) {
  if (typeof text === 'string') {
    return doc.getStringUnitWidth(text)
  } else {
    let acc = 0
    iterateCellText(doc, text, { x, y, lineHeight }, (part) => {
      if (typeof part === 'string') {
        acc += doc.getStringUnitWidth(part)
      } else {
        if (ignoreScripts && part.script !== undefined) {
          return
        }
        acc += doc.getStringUnitWidth(part.text)
      }
    })

    return acc
  }
}

/**
 * Improved text function with halign and valign support
 * Inspiration from: http://stackoverflow.com/questions/28327510/align-text-right-using-jspdf/28433113#28433113
 */
export default function (
  text: string | string[] | CustomCellText,
  x: number,
  y: number,
  styles: TextStyles,
  doc: jsPDFDocument,
) {
  styles = styles || {}
  const PHYSICAL_LINE_HEIGHT = 1.15

  const k = doc.internal.scaleFactor
  const fontSize = doc.internal.getFontSize() / k
  const lineHeightFactor = doc.getLineHeightFactor
    ? doc.getLineHeightFactor()
    : PHYSICAL_LINE_HEIGHT
  const lineHeight = fontSize * lineHeightFactor

  const splitRegex = /\r\n|\r|\n/g
  let splitText: string | string[] | CustomCellText = ''
  let lineCount = 1
  if (
    styles.valign === 'middle' ||
    styles.valign === 'bottom' ||
    styles.halign === 'center' ||
    styles.halign === 'right'
  ) {
    splitText = typeof text === 'string' ? text.split(splitRegex) : text
    lineCount = splitText.length || 1
  }

  // Align the top
  y += fontSize * (2 - PHYSICAL_LINE_HEIGHT)

  if (styles.valign === 'middle') y -= (lineCount / 2) * lineHeight
  else if (styles.valign === 'bottom') y -= lineCount * lineHeight

  if (styles.halign === 'center' || styles.halign === 'right') {
    let alignSize = fontSize
    if (styles.halign === 'center') alignSize *= 0.5

    if (splitText && lineCount >= 1) {
      for (let iLine = 0; iLine < splitText.length; iLine++) {
        const textContent = splitText[iLine]

        doThePrint(
          doc,
          textContent,
          x -
            getCellLineUnitWidth(
              doc,
              textContent,
              x,
              y,
              lineHeight,
              styles.ignoreScriptsInWidthCalc && styles.halign === 'center',
            ) *
              alignSize,
          y,
          lineHeight,
        )
        y += lineHeight
      }
      return doc
    }
    x -=
      getCellLineUnitWidth(
        doc,
        text as string,
        x,
        y,
        lineHeight,
        styles.ignoreScriptsInWidthCalc && styles.halign === 'center',
      ) * alignSize
  }

  if (styles.halign === 'justify') {
    doThePrint(doc, text, x, y, lineHeight, {
      maxWidth: styles.maxWidth || 100,
      align: 'justify',
    })
  } else {
    doThePrint(doc, text, x, y, lineHeight)
  }

  return doc
}

export interface TextStyles {
  valign?: 'middle' | 'bottom' | 'top'
  halign?: 'justify' | 'center' | 'right' | 'left'
  ignoreScriptsInWidthCalc?: boolean
  maxWidth?: number
}

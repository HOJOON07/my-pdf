import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { PageNumberOptions, PageNumberPosition } from '@/types/pdf'

const MARGIN = 20 // pt

function getTextPosition(
  position: PageNumberPosition,
  pageWidth: number,
  pageHeight: number,
  textWidth: number,
  fontSize: number
): { x: number; y: number } {
  const positions: Record<PageNumberPosition, { x: number; y: number }> = {
    'bottom-center': { x: (pageWidth - textWidth) / 2,              y: MARGIN },
    'bottom-left':   { x: MARGIN,                                   y: MARGIN },
    'bottom-right':  { x: pageWidth - textWidth - MARGIN,           y: MARGIN },
    'top-center':    { x: (pageWidth - textWidth) / 2,              y: pageHeight - MARGIN - fontSize },
    'top-left':      { x: MARGIN,                                   y: pageHeight - MARGIN - fontSize },
    'top-right':     { x: pageWidth - textWidth - MARGIN,           y: pageHeight - MARGIN - fontSize },
  }
  return positions[position]
}

export async function addPageNumbers(
  file: File,
  options: PageNumberOptions = { position: 'bottom-center', fontSize: 11, startNumber: 1, format: 'number' }
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const doc = await PDFDocument.load(arrayBuffer)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const totalPages = doc.getPageCount()

  for (let i = 0; i < totalPages; i++) {
    const page = doc.getPage(i)
    const rotation = page.getRotation().angle
    const { width: rawW, height: rawH } = page.getSize()

    // 90°/270° 회전 시 실제 표시 너비/높이가 뒤바뀜
    const displayWidth = (rotation === 90 || rotation === 270) ? rawH : rawW
    const displayHeight = (rotation === 90 || rotation === 270) ? rawW : rawH

    const pageNum = options.startNumber + i
    const text = options.format === 'page-n-of-m'
      ? `${pageNum} / ${options.startNumber + totalPages - 1}`
      : String(pageNum)

    const textWidth = font.widthOfTextAtSize(text, options.fontSize)
    const { x, y } = getTextPosition(options.position, displayWidth, displayHeight, textWidth, options.fontSize)

    page.drawText(text, {
      x,
      y,
      size: options.fontSize,
      font,
      color: rgb(0, 0, 0),
    })
  }

  return doc.save()
}

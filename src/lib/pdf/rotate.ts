import { PDFDocument, degrees } from 'pdf-lib'
import type { PageRotation } from '@/types/pdf'

async function loadPdfDocument(file: File): Promise<PDFDocument> {
  const arrayBuffer = await file.arrayBuffer()
  try {
    return await PDFDocument.load(arrayBuffer)
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.toLowerCase().includes('encrypt') || msg.toLowerCase().includes('password')) {
      throw new Error('비밀번호로 잠긴 PDF는 지원하지 않아요. 비밀번호를 해제한 후 다시 시도해 주세요.')
    }
    throw new Error('PDF 파일을 읽을 수 없어요. 파일이 손상되었거나 올바른 PDF 형식이 아닐 수 있어요.')
  }
}

/**
 * 지정한 페이지들을 회전시킨 PDF를 반환.
 * rotations가 비어 있으면 Error throw.
 * 기존 회전값에 rotateDegrees를 누적 합산하여 setRotation 적용.
 */
export async function rotatePages(file: File, rotations: PageRotation[]): Promise<Uint8Array> {
  if (rotations.length === 0) {
    throw new Error('회전할 페이지를 지정해 주세요.')
  }

  const srcDoc = await loadPdfDocument(file)
  const newDoc = await PDFDocument.create()
  const pageCount = srcDoc.getPageCount()
  const allIndices = Array.from({ length: pageCount }, (_, i) => i)
  const copiedPages = await newDoc.copyPages(srcDoc, allIndices)

  // 0-based index → rotateDegrees 맵
  const rotationMap = new Map<number, number>(
    rotations.map((r) => [r.pageIndex, r.rotateDegrees])
  )

  copiedPages.forEach((page, index) => {
    newDoc.addPage(page)
    const addDeg = rotationMap.get(index)
    if (addDeg !== undefined) {
      const existingDeg = page.getRotation().angle
      const newDeg = (existingDeg + addDeg) % 360
      page.setRotation(degrees(newDeg))
    }
  })

  return newDoc.save()
}

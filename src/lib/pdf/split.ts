import { PDFDocument } from 'pdf-lib'
import type { PageRangeGroup } from '@/types/pdf'

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

/** 소스 파일에서 지정한 0-based 인덱스의 페이지들을 추출하여 Uint8Array 반환 */
export async function extractPages(file: File, indices: number[]): Promise<Uint8Array> {
  const srcDoc = await loadPdfDocument(file)
  const newDoc = await PDFDocument.create()
  const copiedPages = await newDoc.copyPages(srcDoc, indices)
  copiedPages.forEach(page => newDoc.addPage(page))
  return newDoc.save()
}

/** 분할 모드가 'all'일 때 페이지별 Uint8Array 배열 반환 */
export async function splitAllPages(file: File): Promise<Uint8Array[]> {
  const srcDoc = await loadPdfDocument(file)
  const pageCount = srcDoc.getPageCount()
  const results: Uint8Array[] = []

  for (let i = 0; i < pageCount; i++) {
    const newDoc = await PDFDocument.create()
    const [copiedPage] = await newDoc.copyPages(srcDoc, [i])
    newDoc.addPage(copiedPage)
    results.push(await newDoc.save())
  }

  return results
}

/** 분할 모드가 'range'일 때 범위 그룹별 Uint8Array 배열 반환 */
export async function splitByRanges(file: File, groups: PageRangeGroup[]): Promise<Uint8Array[]> {
  const srcDoc = await loadPdfDocument(file)
  const results: Uint8Array[] = []

  for (const group of groups) {
    const newDoc = await PDFDocument.create()
    const copiedPages = await newDoc.copyPages(srcDoc, group.indices)
    copiedPages.forEach(page => newDoc.addPage(page))
    results.push(await newDoc.save())
  }

  return results
}

/** 지정한 0-based 인덱스 페이지를 제거하고 나머지로 구성된 PDF 반환.
 *  모든 페이지가 삭제 대상이면 Error throw. */
export async function deletePages(file: File, indicesToDelete: number[]): Promise<Uint8Array> {
  const srcDoc = await loadPdfDocument(file)
  const totalPages = srcDoc.getPageCount()

  const deleteSet = new Set(indicesToDelete)
  const remainingIndices = Array.from({ length: totalPages }, (_, i) => i)
    .filter(i => !deleteSet.has(i))

  if (remainingIndices.length === 0) {
    throw new Error('모든 페이지를 삭제하면 PDF가 빈 파일이 돼요. 삭제할 페이지를 다시 선택해 주세요.')
  }

  const newDoc = await PDFDocument.create()
  const copiedPages = await newDoc.copyPages(srcDoc, remainingIndices)
  copiedPages.forEach(page => newDoc.addPage(page))
  return newDoc.save()
}

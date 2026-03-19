import { PDFDocument } from 'pdf-lib'
import { extractPages } from './split'
import type { OddEvenMode } from '@/types/pdf'

export async function extractOddOrEvenPages(file: File, mode: OddEvenMode): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const srcDoc = await PDFDocument.load(arrayBuffer)
  const totalPages = srcDoc.getPageCount()

  // 홀수 페이지 (1, 3, 5...) = 0-based 인덱스가 짝수 (0, 2, 4...)
  // 짝수 페이지 (2, 4, 6...) = 0-based 인덱스가 홀수 (1, 3, 5...)
  const indices = Array.from({ length: totalPages }, (_, i) => i)
    .filter(i => mode === 'odd' ? i % 2 === 0 : i % 2 === 1)

  if (indices.length === 0) {
    const label = mode === 'odd' ? '홀수' : '짝수'
    throw new Error(`추출할 ${label} 페이지가 없어요. 파일이 1페이지뿐이에요.`)
  }

  return extractPages(file, indices)
}

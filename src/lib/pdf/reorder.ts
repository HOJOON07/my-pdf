import { PDFDocument } from 'pdf-lib'

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
 * orderedIndices 순서대로 페이지를 재배치한 PDF 반환.
 * orderedIndices는 0-based 원본 인덱스 배열.
 */
export async function reorderPages(file: File, orderedIndices: number[]): Promise<Uint8Array> {
  const srcDoc = await loadPdfDocument(file)
  const newDoc = await PDFDocument.create()
  const copiedPages = await newDoc.copyPages(srcDoc, orderedIndices)
  copiedPages.forEach((page) => newDoc.addPage(page))
  return newDoc.save()
}

import { PDFDocument } from 'pdf-lib'

/** 새 문서로 복사하면서 XMP 스트림 제외 + Document Info Dictionary 빈값 설정 */
export async function removeMetadata(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const srcDoc = await PDFDocument.load(arrayBuffer)
  const totalPages = srcDoc.getPageCount()

  // 새 문서: XMP 메타데이터 스트림이 복사되지 않음
  const newDoc = await PDFDocument.create()
  const allIndices = Array.from({ length: totalPages }, (_, i) => i)
  const copiedPages = await newDoc.copyPages(srcDoc, allIndices)
  copiedPages.forEach(page => newDoc.addPage(page))

  // Document Information Dictionary 초기화
  newDoc.setTitle('')
  newDoc.setAuthor('')
  newDoc.setSubject('')
  newDoc.setKeywords([])
  newDoc.setCreator('')
  newDoc.setProducer('')

  return newDoc.save()
}

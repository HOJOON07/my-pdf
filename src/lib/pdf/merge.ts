import { PDFDocument } from 'pdf-lib'
import { validateFileType, checkSingleFileSizePolicy, validatePageCount } from './validate'

/** 단일 파일의 페이지 수를 로드하여 반환. 파일 추가 시 호출. */
export async function getPdfPageCount(file: File): Promise<number> {
  validateFileType(file)

  const policy = checkSingleFileSizePolicy(file)
  if (policy === 'reject') {
    throw new Error('400MB를 초과하는 파일은 지원하지 않아요.')
  }

  const arrayBuffer = await file.arrayBuffer()
  let doc: PDFDocument
  try {
    doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: false })
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.toLowerCase().includes('encrypt') || msg.toLowerCase().includes('password')) {
      throw new Error('비밀번호로 잠긴 PDF는 지원하지 않아요. 비밀번호를 해제한 후 다시 시도해 주세요.')
    }
    throw new Error('PDF 파일을 읽을 수 없어요. 파일이 손상되었거나 올바른 PDF 형식이 아닐 수 있어요.')
  }

  validatePageCount(doc)
  return doc.getPageCount()
}

/** 파일 배열을 순서대로 병합하여 Uint8Array 반환 */
export async function mergePDFs(files: File[]): Promise<Uint8Array> {
  if (files.length < 2) {
    throw new Error('2개 이상의 PDF 파일이 필요합니다.')
  }

  const mergedDoc = await PDFDocument.create()

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer()
    let srcDoc: PDFDocument
    try {
      srcDoc = await PDFDocument.load(arrayBuffer)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg.toLowerCase().includes('encrypt') || msg.toLowerCase().includes('password')) {
        throw new Error(`비밀번호로 잠긴 PDF는 지원하지 않아요. (${file.name})`)
      }
      throw new Error(`PDF 파일을 읽을 수 없어요. 파일이 손상되었거나 올바른 PDF 형식이 아닐 수 있어요. (${file.name})`)
    }

    const pageCount = srcDoc.getPageCount()
    const pageIndices = Array.from({ length: pageCount }, (_, i) => i)
    const copiedPages = await mergedDoc.copyPages(srcDoc, pageIndices)
    copiedPages.forEach(page => mergedDoc.addPage(page))
  }

  return mergedDoc.save()
}

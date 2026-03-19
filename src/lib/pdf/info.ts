import { PDFDocument } from 'pdf-lib'
import { isEncryptedPDF } from './validate'
import type { PdfInfo } from '@/types/pdf'

function readPdfVersion(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const header = new TextDecoder('latin1').decode(bytes.slice(0, 16))
  const match = header.match(/%PDF-(\d+\.\d+)/)
  return match ? match[1] : '알 수 없음'
}

export async function getPdfInfo(file: File): Promise<PdfInfo> {
  const arrayBuffer = await file.arrayBuffer()

  const encrypted = await isEncryptedPDF(arrayBuffer)
  if (encrypted) {
    return {
      fileName: file.name,
      fileSize: file.size,
      pdfVersion: readPdfVersion(arrayBuffer),
      pageCount: 0,
      isEncrypted: true,
    }
  }

  let doc: PDFDocument
  try {
    doc = await PDFDocument.load(arrayBuffer)
  } catch {
    throw new Error('PDF 파일을 읽을 수 없어요. 파일이 손상되었거나 올바른 PDF 형식이 아닐 수 있어요.')
  }

  return {
    fileName: file.name,
    fileSize: file.size,
    pdfVersion: readPdfVersion(arrayBuffer),
    pageCount: doc.getPageCount(),
    title: doc.getTitle(),
    author: doc.getAuthor(),
    subject: doc.getSubject(),
    keywords: doc.getKeywords(),
    creator: doc.getCreator(),
    producer: doc.getProducer(),
    creationDate: doc.getCreationDate(),
    modificationDate: doc.getModificationDate(),
    isEncrypted: false,
  }
}

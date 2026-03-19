import { PDFDocument } from 'pdf-lib-plus-encrypt'

/**
 * PDF에 AES-256 암호화를 적용하여 Uint8Array 반환.
 * ownerPassword는 MVP 정책상 userPassword와 동일값 사용.
 * 이미 암호화된 PDF를 전달하면 에러 throw.
 *
 * @param file          원본 PDF 파일
 * @param userPassword  열람 비밀번호 (빈 문자열 불가 — 훅에서 사전 검증)
 */
export async function protectPDF(file: File, userPassword: string): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  try {
    const pdfDoc = await PDFDocument.load(arrayBuffer)

    // pdf-lib-plus-encrypt의 encrypt()가 pdfVersion을 문서 기존 버전으로 덮어쓰므로,
    // 헤더 버전을 먼저 1.7ext3으로 설정해야 AES-256(version 5)이 정상 적용됨
    const header = (pdfDoc as any).context?.header
    if (header) {
      header.major = '1'
      header.minor = '7ext3'
    }

    await pdfDoc.encrypt({
      userPassword,
      ownerPassword: userPassword,  // MVP: owner password = user password
      pdfVersion: '1.7ext3',        // AES-256
    })
    return pdfDoc.save()
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.toLowerCase().includes('encrypt') || msg.toLowerCase().includes('password')) {
      throw new Error('이미 암호화된 PDF 파일이에요. 암호화되지 않은 PDF를 선택해 주세요.')
    }
    throw new Error('PDF 파일을 처리할 수 없어요. 파일이 손상되었거나 올바른 PDF 형식이 아닐 수 있어요.')
  }
}

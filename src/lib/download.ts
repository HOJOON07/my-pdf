import JSZip from 'jszip'

/** Uint8Array를 PDF 파일로 다운로드 */
export function downloadPDF(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // 잠시 후 URL 해제 (다운로드가 시작될 시간 확보)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Uint8Array 배열을 ZIP으로 묶어 다운로드 */
export async function downloadZip(
  files: Array<{ name: string; bytes: Uint8Array }>,
  zipName: string,
): Promise<void> {
  const zip = new JSZip()
  for (const { name, bytes } of files) {
    zip.file(name, bytes)
  }
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = zipName.endsWith('.zip') ? zipName : `${zipName}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

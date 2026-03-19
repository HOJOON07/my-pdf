import type { PdfInfo } from '@/types/pdf'

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
}

function formatDate(date: Date | undefined): string {
  if (!date) return '-'
  try {
    return date.toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return date.toISOString().slice(0, 16).replace('T', ' ')
  }
}

function MetaRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <>
      <dt className="text-sm font-medium whitespace-nowrap text-gray-500">{label}</dt>
      <dd className={`text-sm ${muted || value === '-' ? 'italic text-gray-400' : 'text-gray-900'}`}>
        {value}
      </dd>
    </>
  )
}

interface MetadataPanelProps {
  info: PdfInfo
  /** true: 파일명/크기/페이지수/버전/암호화 포함. false: 메타데이터만 */
  showFileInfo?: boolean
}

export function MetadataPanel({ info, showFileInfo = true }: MetadataPanelProps) {
  const val = (v: string | undefined): string => (v && v.trim()) ? v : '-'

  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
        {showFileInfo && (
          <>
            <MetaRow label="파일명" value={info.fileName} />
            <MetaRow label="파일 크기" value={formatFileSize(info.fileSize)} />
            <MetaRow label="페이지 수" value={info.isEncrypted ? '-' : `${info.pageCount}페이지`} />
            <MetaRow label="PDF 버전" value={info.pdfVersion} />
            <MetaRow
              label="암호화"
              value={info.isEncrypted ? '잠금됨' : '잠금 해제됨'}
            />
            {/* 구분선 */}
            <div className="col-span-2 border-t border-gray-200 my-0.5" />
          </>
        )}
        <MetaRow label="제목" value={val(info.title)} />
        <MetaRow label="작성자" value={val(info.author)} />
        <MetaRow label="주제" value={val(info.subject)} />
        <MetaRow label="키워드" value={val(info.keywords)} />
        <MetaRow label="생성 도구" value={val(info.creator)} />
        <MetaRow label="PDF 변환기" value={val(info.producer)} />
        <MetaRow label="생성일" value={formatDate(info.creationDate)} />
        <MetaRow label="수정일" value={formatDate(info.modificationDate)} />
      </dl>
    </div>
  )
}

export function buildClipboardText(info: PdfInfo): string {
  const val = (v: string | undefined) => (v && v.trim()) ? v : '-'
  const lines: string[] = [
    `파일명: ${info.fileName}`,
    `파일 크기: ${formatFileSize(info.fileSize)}`,
    `페이지 수: ${info.isEncrypted ? '-' : `${info.pageCount}페이지`}`,
    `PDF 버전: ${info.pdfVersion}`,
    `암호화: ${info.isEncrypted ? '잠금됨' : '잠금 해제됨'}`,
    '---',
    `제목: ${val(info.title)}`,
    `작성자: ${val(info.author)}`,
    `주제: ${val(info.subject)}`,
    `키워드: ${val(info.keywords)}`,
    `생성 도구: ${val(info.creator)}`,
    `PDF 변환기: ${val(info.producer)}`,
    `생성일: ${formatDate(info.creationDate)}`,
    `수정일: ${formatDate(info.modificationDate)}`,
  ]
  return lines.join('\n')
}

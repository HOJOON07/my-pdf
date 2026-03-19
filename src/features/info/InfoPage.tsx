import { useState } from 'react'
import { FileText, X, Loader2, AlertCircle, Lock, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FileDropZone } from '@/components/FileDropZone'
import { MetadataPanel, buildClipboardText } from '@/components/MetadataPanel'
import { useInfo } from './useInfo'

export function InfoPage() {
  const { file, info, status, error, setFile, removeFile } = useInfo()
  const [copied, setCopied] = useState(false)
  const clipboardSupported = typeof navigator !== 'undefined' && !!navigator.clipboard

  async function handleCopy() {
    if (!info) return
    try {
      await navigator.clipboard.writeText(buildClipboardText(info))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard 실패 무시
    }
  }

  return (
    <div className="space-y-5">
      {!file && (
        <FileDropZone
          onFiles={(files) => { if (files[0]) setFile(files[0]) }}
          multiple={false}
          title="PDF 파일을 여기에 드래그하거나 파일 선택"
        />
      )}

      {file && (
        <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-4 py-3">
          <FileText className="h-5 w-5 shrink-0 text-blue-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-800">{file.name}</p>
          </div>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 shrink-0"
            onClick={removeFile} aria-label={`${file.name} 제거`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {status === 'loading' && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          파일 분석 중이에요...
        </div>
      )}

      {status === 'error' && error && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {status === 'done' && info && (
        <>
          {info.isEncrypted && (
            <div role="status" className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-sm text-amber-700">
                이 파일은 비밀번호로 잠겨 있어요. 파일 속성은 표시되지만 메타데이터는 접근이 제한되어 있어요.
              </p>
            </div>
          )}

          <MetadataPanel info={info} showFileInfo={true} />

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!clipboardSupported}
            title={!clipboardSupported ? '클립보드 복사가 지원되지 않는 브라우저예요' : undefined}
          >
            {copied ? (
              <><Check className="mr-2 h-4 w-4" />복사됨!</>
            ) : (
              <><Copy className="mr-2 h-4 w-4" />정보 복사</>
            )}
          </Button>
        </>
      )}
    </div>
  )
}

import { Loader2, CheckCircle, AlertCircle, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FileDropZone } from '@/components/FileDropZone'
import { PageRangeInput } from '@/features/split/PageRangeInput'
import { OutputNameInput } from '@/features/merge/OutputNameInput'
import { RotateDegreeSelector } from './RotateDegreeSelector'
import { useRotate } from './useRotate'

export function RotatePage() {
  const {
    file,
    rangeInput,
    rangeError,
    degree,
    outputName,
    status,
    error,
    canExecute,
    setFile,
    setRangeInput,
    setDegree,
    setOutputName,
    handleRotate,
    reset,
  } = useRotate()

  const isProcessing = status === 'processing'
  const isDone = status === 'done'

  if (isDone) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <div>
          <p className="text-lg font-semibold text-green-800">회전 완료!</p>
          <p className="mt-1 text-sm text-green-600">다운로드가 시작되었습니다.</p>
        </div>
        <Button onClick={reset}>새 작업 시작</Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {!file && (
        <FileDropZone
          onFiles={(files) => { if (files[0]) setFile(files[0]) }}
          multiple={false}
          title="회전할 PDF 파일을 여기에 끌어다 놓으세요"
          disabled={isProcessing}
        />
      )}

      {file && (
        <>
          <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-4 py-3">
            <FileText className="h-5 w-5 text-blue-500" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-800">{file.file.name}</p>
              <p className="text-xs text-gray-500">전체 {file.pageCount}페이지</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={reset}
              disabled={isProcessing}
              aria-label={`${file.file.name} 제거`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <RotateDegreeSelector
            value={degree}
            onChange={setDegree}
            disabled={isProcessing}
          />

          <PageRangeInput
            label={`회전할 페이지 (전체: ${file.pageCount}페이지)`}
            hint="비워두면 전체 페이지에 회전이 적용됩니다"
            placeholder="예: 1, 3-5  (비워두면 전체 페이지에 적용)"
            showHintAlways
            value={rangeInput}
            onChange={setRangeInput}
            error={rangeError}
            disabled={isProcessing}
          />

          <OutputNameInput
            value={outputName}
            onChange={setOutputName}
            disabled={isProcessing}
            placeholder={`${file.file.name.replace(/\.pdf$/i, '')}_rotated.pdf`}
          />
        </>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
        </div>
      )}

      {file && (
        <Button
          className="w-full"
          size="lg"
          onClick={handleRotate}
          disabled={!canExecute}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              회전 중...
            </>
          ) : (
            'PDF 회전하기 →'
          )}
        </Button>
      )}
    </div>
  )
}

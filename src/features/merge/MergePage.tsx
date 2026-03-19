import { useRef } from 'react'
import { Loader2, CheckCircle, AlertCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FileDropZone } from '@/components/FileDropZone'
import { FileList } from './FileList'
import { OutputNameInput } from './OutputNameInput'
import { useMerge } from './useMerge'

export function MergePage() {
  const {
    files,
    outputName,
    status,
    error,
    addFiles,
    removeFile,
    reorderFiles,
    setOutputName,
    handleMerge,
    retryDownload,
    reset,
  } = useMerge()

  const addMoreRef = useRef<HTMLInputElement>(null)
  const isProcessing = status === 'processing'
  const isDone = status === 'done'
  const hasFiles = files.length > 0
  const canMerge = files.length >= 2 && !isProcessing

  if (isDone) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <div>
          <p className="text-lg font-semibold text-green-800">병합 완료!</p>
          <p className="mt-1 text-sm text-green-600">다운로드가 시작되었습니다.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={retryDownload}>
            다시 다운로드
          </Button>
          <Button onClick={reset}>새 작업 시작</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {!hasFiles && (
        <FileDropZone
          onFiles={addFiles}
          multiple
          title="PDF 파일을 여기에 끌어다 놓으세요"
          disabled={isProcessing}
        />
      )}

      {hasFiles && (
        <>
          <FileList
            files={files}
            onReorder={reorderFiles}
            onRemove={removeFile}
            disabled={isProcessing}
          />

          <div>
            <input
              ref={addMoreRef}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(Array.from(e.target.files))
                e.target.value = ''
              }}
              disabled={isProcessing}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => addMoreRef.current?.click()}
              disabled={isProcessing}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              파일 더 추가
            </Button>
          </div>

          <OutputNameInput
            value={outputName}
            onChange={setOutputName}
            disabled={isProcessing}
          />

          {files.length === 1 && (
            <p className="text-sm text-amber-600">
              2개 이상의 PDF 파일을 추가해야 병합할 수 있어요
            </p>
          )}
        </>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
        </div>
      )}

      {hasFiles && (
        <Button
          className="w-full"
          size="lg"
          onClick={handleMerge}
          disabled={!canMerge}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              병합 중...
            </>
          ) : (
            'PDF 병합하기 →'
          )}
        </Button>
      )}
    </div>
  )
}

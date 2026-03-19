import { Loader2, CheckCircle, AlertCircle, Download, Lock, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OutputNameInput } from '@/features/merge/OutputNameInput'
import { ImageDropZone } from './ImageDropZone'
import { ImageCardList } from './ImageCardList'
import { PageSizePicker } from './PageSizePicker'
import { useImageToPdf } from './useImageToPdf'

export function ImageToPdfPage() {
  const {
    images,
    pageSize,
    outputName,
    status,
    error,
    resultBlob,
    resultPageCount,
    canConvert,
    totalSizeError,
    addImages,
    removeImage,
    reorderImages,
    setPageSize,
    setOutputName,
    handleConvert,
    handleRetryDownload,
    retryFromError,
    reset,
  } = useImageToPdf()

  const isProcessing = status === 'processing'
  const isDone = status === 'done'
  const isError = status === 'error'
  const hasImages = images.length > 0

  if (isDone) {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-4 rounded-lg border border-green-200 bg-green-50 p-8 text-center"
      >
        <CheckCircle className="h-12 w-12 text-green-500" />
        <div>
          <p className="text-lg font-semibold text-green-800">PDF 변환 완료!</p>
          {resultPageCount !== null && (
            <p className="mt-0.5 text-sm text-green-700">{outputName || 'images'}.pdf ({resultPageCount}페이지)</p>
          )}
          <p className="mt-1 text-sm text-green-600">파일이 자동으로 다운로드 되었어요.</p>
        </div>
        <div className="flex gap-3">
          {resultBlob && (
            <Button variant="outline" onClick={handleRetryDownload}>
              <Download className="mr-2 h-4 w-4" />
              다시 다운로드
            </Button>
          )}
          <Button onClick={reset}>새 작업 시작</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* 초기 상태: 드롭존 */}
      {!hasImages && (
        <>
          <ImageDropZone onFiles={addImages} disabled={isProcessing} />
          <div className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
            <Shield className="h-4 w-4 shrink-0 text-gray-400" />
            파일이 내 기기를 떠나지 않아요
          </div>
        </>
      )}

      {/* 이미지 목록 */}
      {hasImages && (
        <ImageCardList
          images={images}
          onRemove={removeImage}
          onReorder={reorderImages}
          onAdd={addImages}
          disabled={isProcessing}
        />
      )}

      {/* 합산 크기 에러 배너 */}
      {totalSizeError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{totalSizeError}</p>
        </div>
      )}

      {/* 처리 실패 에러 카드 */}
      {isError && error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700">PDF 변환 중 오류가 발생했어요.</p>
            <p className="mt-0.5 text-sm text-red-600">{error}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 text-red-600 hover:text-red-700"
            onClick={retryFromError}
          >
            다시 시도
          </Button>
        </div>
      )}

      {/* 이미지 업로드 후 설정 영역 */}
      {hasImages && (
        <>
          <PageSizePicker
            value={pageSize}
            onChange={setPageSize}
            disabled={isProcessing}
          />

          <OutputNameInput
            value={outputName}
            onChange={setOutputName}
            disabled={isProcessing}
            placeholder="images.pdf"
          />

          <Button
            className="w-full"
            size="lg"
            onClick={handleConvert}
            disabled={!canConvert}
            aria-busy={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                변환 중이에요...
              </>
            ) : (
              'PDF 만들기'
            )}
          </Button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
            <Lock className="h-3.5 w-3.5" />
            파일이 서버로 전송되지 않아요
          </div>
        </>
      )}
    </div>
  )
}

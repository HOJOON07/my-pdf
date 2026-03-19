import { useState, useMemo, useCallback, useEffect } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import type { ImageFileItem, PageSizeMode, ProcessingStatus } from '@/types/pdf'
import { validateImageFile, checkImageSizePolicy, checkTotalImageSizePolicy, isGifFile } from '@/lib/pdf/validateImage'
import { imagesToPdf } from '@/lib/pdf/imageToPdf'
import { downloadPDF } from '@/lib/download'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function computeOutputName(images: ImageFileItem[]): string {
  const valid = images.filter(img => !img.error)
  if (valid.length === 1) {
    return valid[0].file.name.replace(/\.[^.]+$/, '')
  }
  return 'images'
}

export interface UseImageToPdfReturn {
  images: ImageFileItem[]
  pageSize: PageSizeMode
  outputName: string
  status: ProcessingStatus
  error: string | null
  resultBlob: Blob | null
  resultPageCount: number | null
  canConvert: boolean
  totalSizeError: string | null
  addImages: (files: File[]) => void
  removeImage: (id: string) => void
  reorderImages: (activeId: string, overId: string) => void
  setPageSize: (mode: PageSizeMode) => void
  setOutputName: (name: string) => void
  handleConvert: () => Promise<void>
  handleRetryDownload: () => void
  retryFromError: () => void
  reset: () => void
}

export function useImageToPdf(): UseImageToPdfReturn {
  const [images, setImages] = useState<ImageFileItem[]>([])
  const [pageSize, setPageSizeState] = useState<PageSizeMode>('a4')
  const [outputName, setOutputNameState] = useState('images')
  const [outputNameDirty, setOutputNameDirty] = useState(false)
  const [status, setStatus] = useState<ProcessingStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [resultPageCount, setResultPageCount] = useState<number | null>(null)

  // 썸네일 URL 해제 (언마운트 시)
  useEffect(() => {
    return () => {
      images.forEach(img => {
        if (img.previewUrl) URL.revokeObjectURL(img.previewUrl)
      })
    }
    // intentional: only on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addImages = useCallback((files: File[]) => {
    setImages(prev => {
      const newItems: ImageFileItem[] = files.map(file => {
        const id = generateId()

        try {
          validateImageFile(file)
        } catch (e) {
          return {
            id,
            file,
            previewUrl: '',
            error: e instanceof Error ? e.message : '지원하지 않는 이미지 형식이에요.',
          }
        }

        const sizePolicy = checkImageSizePolicy(file)
        if (sizePolicy === 'reject') {
          return {
            id,
            file,
            previewUrl: '',
            error: `파일 크기가 너무 커요. 50MB 이하 파일을 선택해 주세요. (${formatFileSize(file.size)})`,
          }
        }

        const previewUrl = URL.createObjectURL(file)
        const item: ImageFileItem = {
          id,
          file,
          previewUrl,
          isGif: isGifFile(file),
        }

        if (sizePolicy === 'warn') {
          item.sizeWarning = `파일이 커서 처리 시간이 걸릴 수 있어요. (${formatFileSize(file.size)})`
        }

        return item
      })

      return [...prev, ...newItems]
    })
  }, [])

  const removeImage = useCallback((id: string) => {
    setImages(prev => {
      const item = prev.find(img => img.id === id)
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
      return prev.filter(img => img.id !== id)
    })
  }, [])

  const reorderImages = useCallback((activeId: string, overId: string) => {
    setImages(prev => {
      const oldIndex = prev.findIndex(img => img.id === activeId)
      const newIndex = prev.findIndex(img => img.id === overId)
      if (oldIndex === -1 || newIndex === -1) return prev
      return arrayMove(prev, oldIndex, newIndex)
    })
  }, [])

  // 출력 파일명 자동 갱신 (사용자가 직접 수정하지 않은 경우만)
  useEffect(() => {
    if (!outputNameDirty) {
      setOutputNameState(computeOutputName(images))
    }
  }, [images, outputNameDirty])

  const setPageSize = useCallback((mode: PageSizeMode) => {
    setPageSizeState(mode)
  }, [])

  const setOutputName = useCallback((name: string) => {
    setOutputNameState(name)
    setOutputNameDirty(true)
  }, [])

  const totalSizeError = useMemo(() => {
    const validFiles = images.filter(img => !img.error).map(img => img.file)
    if (validFiles.length === 0) return null
    const policy = checkTotalImageSizePolicy(validFiles)
    if (policy === 'reject') return '이미지 파일 합산 크기가 200MB를 초과해요. 일부 이미지를 제거해 주세요.'
    return null
  }, [images])

  const canConvert = useMemo(() => {
    const hasValidImages = images.some(img => !img.error)
    const hasErrorImages = images.some(img => !!img.error)
    return (
      hasValidImages &&
      !hasErrorImages &&
      outputName.trim().length > 0 &&
      status === 'idle' &&
      totalSizeError === null
    )
  }, [images, outputName, status, totalSizeError])

  const handleConvert = useCallback(async () => {
    if (!canConvert) return

    const validImages = images.filter(img => !img.error)
    setStatus('processing')
    setError(null)

    const finalName = (outputName.trim() || 'images') + '.pdf'

    try {
      const bytes = await imagesToPdf(validImages.map(img => img.file), pageSize)
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      downloadPDF(bytes, finalName)
      setResultBlob(blob)
      setResultPageCount(validImages.length)
      setStatus('done')
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'PDF 변환 중 오류가 발생했어요. 다시 시도해주세요.')
    }
  }, [canConvert, images, outputName, pageSize])

  const handleRetryDownload = useCallback(() => {
    if (!resultBlob) return
    const finalName = (outputName.trim() || 'images') + '.pdf'
    const url = URL.createObjectURL(resultBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = finalName
    a.click()
    URL.revokeObjectURL(url)
  }, [resultBlob, outputName])

  const retryFromError = useCallback(() => {
    setStatus('idle')
    setError(null)
  }, [])

  const reset = useCallback(() => {
    setImages(prev => {
      prev.forEach(img => { if (img.previewUrl) URL.revokeObjectURL(img.previewUrl) })
      return []
    })
    setOutputNameState('images')
    setOutputNameDirty(false)
    setPageSizeState('a4')
    setStatus('idle')
    setError(null)
    setResultBlob(null)
    setResultPageCount(null)
  }, [])

  return {
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
  }
}

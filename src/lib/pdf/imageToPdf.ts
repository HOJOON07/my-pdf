import { PDFDocument, rgb } from 'pdf-lib'

export type PageSizeMode = 'a4' | 'letter' | 'original'

type ImageFormat = 'jpg' | 'png' | 'canvas-to-png' | 'unsupported'

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const LETTER_WIDTH = 612
const LETTER_HEIGHT = 792
const MARGIN = 40

function detectImageFormat(file: File): ImageFormat {
  const mime = file.type.toLowerCase()
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (mime === 'image/jpeg' || ext === 'jpg' || ext === 'jpeg') return 'jpg'
  if (mime === 'image/png' || ext === 'png') return 'png'
  if (
    mime === 'image/webp' || mime === 'image/gif' || mime === 'image/bmp' ||
    ext === 'webp' || ext === 'gif' || ext === 'bmp'
  ) return 'canvas-to-png'
  return 'unsupported'
}

async function convertToPng(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        reject(new Error(`이미지 크기를 읽을 수 없어요: ${file.name}`))
        return
      }

      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas 컨텍스트를 생성할 수 없어요.'))
        return
      }

      ctx.drawImage(img, 0, 0)

      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error('이미지 변환에 실패했어요.'))
          return
        }
        blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)))
      }, 'image/png')
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`이미지를 불러올 수 없어요. 파일이 손상되었거나 지원하지 않는 형식일 수 있어요: ${file.name}`))
    }

    img.src = url
  })
}

function fitImageToPage(
  doc: PDFDocument,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  image: any,
  pageWidth: number,
  pageHeight: number
): void {
  const page = doc.addPage([pageWidth, pageHeight])
  const { width: imgW, height: imgH } = image

  // 흰색 배경 (투명 PNG를 위해)
  page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: rgb(1, 1, 1) })

  const maxW = pageWidth - MARGIN * 2
  const maxH = pageHeight - MARGIN * 2

  // 비율 유지, 확대 없음
  const scale = Math.min(maxW / imgW, maxH / imgH, 1.0)
  const drawW = imgW * scale
  const drawH = imgH * scale

  // 중앙 정렬 (좌하단 원점 기준)
  const x = (pageWidth - drawW) / 2
  const y = (pageHeight - drawH) / 2

  page.drawImage(image, { x, y, width: drawW, height: drawH })
}

function buildPageFromOriginalSize(
  doc: PDFDocument,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  image: any
): void {
  const { width, height } = image
  const page = doc.addPage([width, height])
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) })
  page.drawImage(image, { x: 0, y: 0, width, height })
}

export async function imagesToPdf(files: File[], mode: PageSizeMode = 'a4'): Promise<Uint8Array> {
  if (files.length === 0) {
    throw new Error('이미지 파일을 1개 이상 추가해 주세요.')
  }

  const doc = await PDFDocument.create()

  for (const file of files) {
    const format = detectImageFormat(file)
    if (format === 'unsupported') {
      throw new Error(`지원하지 않는 이미지 형식이에요: ${file.name}`)
    }

    let imageBytes: Uint8Array
    let embedFormat: 'jpg' | 'png'

    if (format === 'jpg') {
      imageBytes = new Uint8Array(await file.arrayBuffer())
      embedFormat = 'jpg'
    } else if (format === 'png') {
      imageBytes = new Uint8Array(await file.arrayBuffer())
      embedFormat = 'png'
    } else {
      imageBytes = await convertToPng(file)
      embedFormat = 'png'
    }

    let image
    try {
      image = embedFormat === 'jpg'
        ? await doc.embedJpg(imageBytes)
        : await doc.embedPng(imageBytes)
    } catch {
      throw new Error(`이미지를 읽을 수 없어요: ${file.name}\n파일이 손상되었을 수 있어요.`)
    }

    if (mode === 'a4') {
      fitImageToPage(doc, image, A4_WIDTH, A4_HEIGHT)
    } else if (mode === 'letter') {
      fitImageToPage(doc, image, LETTER_WIDTH, LETTER_HEIGHT)
    } else {
      buildPageFromOriginalSize(doc, image)
    }
  }

  return doc.save()
}

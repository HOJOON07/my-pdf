# 이미지 → PDF 변환 도메인 로직 설계

> 버전: 1.0.0
> 작성일: 2026-03-19
> 작성자: PDF Domain Specialist
> 대상: Frontend Architect, Frontend Implementation, QA Engineer

---

## 1. 기능 정의

사용자가 1개 이상의 이미지 파일을 업로드하면, 각 이미지를 한 페이지로 하는 멀티페이지 PDF를 생성한다.

| 항목 | 내용 |
|------|------|
| 입력 | 이미지 파일 1개 이상 (JPG, PNG, WebP, GIF, BMP) |
| 출력 | 단일 PDF 파일 |
| 페이지 구성 | 이미지 1장 = PDF 1페이지 |
| 페이지 순서 | 사용자가 지정한 순서 (드래그 재정렬 가능) |

---

## 2. pdf-lib 이미지 임베딩 API

### 2.1 지원 포맷

pdf-lib는 **JPG(JPEG)와 PNG만 직접 지원**한다.

```typescript
import { PDFDocument } from 'pdf-lib'

const doc = await PDFDocument.create()

// JPG 임베딩
const jpgImage = await doc.embedJpg(jpgBytes)       // Uint8Array | ArrayBuffer

// PNG 임베딩
const pngImage = await doc.embedPng(pngBytes)       // Uint8Array | ArrayBuffer
```

`embedJpg` / `embedPng`는 이미지 바이트를 파싱하여 `PDFImage` 객체를 반환한다.
`PDFImage`에서 픽셀 기준 원본 크기를 얻을 수 있다:

```typescript
const { width, height } = jpgImage  // 픽셀 단위 원본 크기
```

### 2.2 페이지에 이미지 그리기

```typescript
const page = doc.addPage([pageWidth, pageHeight])  // pt 단위

page.drawImage(image, {
  x: offsetX,
  y: offsetY,
  width: drawWidth,
  height: drawHeight,
})
```

pdf-lib의 좌표계는 **좌하단 원점(0,0)** 이다.
`y` 값은 페이지 하단에서의 거리이므로, 이미지를 페이지 상단에 배치하려면 `y = pageHeight - offsetY - drawHeight`를 사용한다.

---

## 3. 페이지 크기 매핑 전략

두 가지 모드를 지원한다.

### 3.1 모드 A: 이미지 원본 크기로 페이지 생성

이미지 픽셀 크기를 그대로 포인트(pt) 단위로 사용한다.
PDF 1pt = 1/72 인치 = 약 0.353mm.

```typescript
function buildPageFromImageOriginalSize(
  doc: PDFDocument,
  image: PDFImage
): void {
  const { width, height } = image
  const page = doc.addPage([width, height])
  page.drawImage(image, { x: 0, y: 0, width, height })
}
```

**특징:**
- 이미지와 PDF 페이지 크기가 1:1 대응
- 인쇄 시 픽셀 밀도(DPI)에 따라 실제 인쇄 크기가 달라짐
- 스크린 캡처(72~96dpi)는 크게, 스캔 이미지(300dpi)는 작게 인쇄됨

### 3.2 모드 B: A4 페이지에 비율 유지 + 중앙 정렬

A4 크기: 595.28 × 841.89 pt (210mm × 297mm @ 72pt/inch).
여백을 두고 이미지를 최대한 크게 맞춘 뒤 중앙에 배치한다.

```typescript
const A4_WIDTH = 595.28   // pt
const A4_HEIGHT = 841.89  // pt
const MARGIN = 40         // pt (상하좌우 동일)

function fitImageToA4(
  doc: PDFDocument,
  image: PDFImage
): void {
  const page = doc.addPage([A4_WIDTH, A4_HEIGHT])
  const { width: imgW, height: imgH } = image

  const maxW = A4_WIDTH - MARGIN * 2
  const maxH = A4_HEIGHT - MARGIN * 2

  // 비율 유지 축소 (확대는 하지 않음: Math.min 기준 1.0 이하)
  const scale = Math.min(maxW / imgW, maxH / imgH, 1.0)
  const drawW = imgW * scale
  const drawH = imgH * scale

  // 중앙 정렬 (좌하단 원점 기준)
  const x = (A4_WIDTH - drawW) / 2
  const y = (A4_HEIGHT - drawH) / 2

  page.drawImage(image, { x, y, width: drawW, height: drawH })
}
```

**특징:**
- 항상 A4 크기 페이지 생성
- 이미지가 A4보다 작으면 원본 크기 유지 (확대 없음) + 중앙 배치
- 이미지가 A4보다 크면 비율 유지 축소
- 인쇄 친화적

### 3.3 권장 기본값

MVP 기본값은 **모드 B (A4 맞춤)**을 권장한다.
사용자 대부분이 인쇄 목적으로 이미지를 PDF로 변환하며, A4가 가장 익숙한 기준이다.
원본 크기 모드는 고급 옵션으로 제공하거나 생략 가능하다.

---

## 4. 지원 포맷 및 변환 전략

### 4.1 포맷별 처리 방법

| 포맷 | MIME 타입 | pdf-lib 직접 지원 | 처리 방법 |
|------|---------|-----------------|---------|
| JPEG / JPG | `image/jpeg` | 직접 지원 | `embedJpg()` |
| PNG | `image/png` | 직접 지원 | `embedPng()` |
| WebP | `image/webp` | 미지원 | Canvas API → PNG 변환 후 `embedPng()` |
| GIF | `image/gif` | 미지원 | Canvas API → PNG 변환 후 `embedPng()` (첫 프레임만) |
| BMP | `image/bmp` | 미지원 | Canvas API → PNG 변환 후 `embedPng()` |
| HEIC / HEIF | `image/heic` | 미지원 | 브라우저 미지원 → 변환 불가, 거부 처리 |
| TIFF | `image/tiff` | 미지원 | 브라우저 미지원 (Safari 예외) → 거부 처리 |
| SVG | `image/svg+xml` | 미지원 | Canvas API → PNG 변환 가능하나 복잡도 높음 → MVP 제외 |

### 4.2 Canvas API 변환 구현

WebP, GIF, BMP를 PNG로 변환하는 공통 함수:

```typescript
async function convertToPng(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas 컨텍스트를 생성할 수 없어요.'))
        return
      }

      // GIF의 경우 첫 프레임만 렌더링됨 (브라우저 기본 동작)
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
      reject(new Error('이미지를 불러올 수 없어요. 파일이 손상되었거나 지원하지 않는 형식일 수 있어요.'))
    }

    img.src = url
  })
}
```

**Canvas API 주의사항:**
- `img.naturalWidth` / `img.naturalHeight`: 브라우저가 디코딩한 실제 픽셀 크기. 이 값을 pdf-lib에 전달해야 한다.
- GIF 애니메이션: 첫 프레임만 렌더링됨. 사용자에게 명시적으로 안내 불필요 (GIF → 정지 이미지가 일반적 기대).
- CORS: `URL.createObjectURL(file)`을 사용하므로 CORS 문제 없음.

### 4.3 이미지 타입 판별 함수

```typescript
type ImageFormat = 'jpg' | 'png' | 'canvas-to-png' | 'unsupported'

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
```

---

## 5. 복수 이미지 → 멀티페이지 PDF

### 5.1 핵심 로직

```typescript
export type PageSizeMode = 'a4' | 'original'

export async function imagesToPdf(
  files: File[],
  mode: PageSizeMode = 'a4'
): Promise<Uint8Array> {
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
      // canvas-to-png
      imageBytes = await convertToPng(file)
      embedFormat = 'png'
    }

    const image = embedFormat === 'jpg'
      ? await doc.embedJpg(imageBytes)
      : await doc.embedPng(imageBytes)

    if (mode === 'a4') {
      fitImageToA4(doc, image)
    } else {
      buildPageFromImageOriginalSize(doc, image)
    }
  }

  return doc.save()
}
```

### 5.2 메모리 관리 (대량 이미지)

이미지 처리 시 메모리에 동시에 올라가는 항목:
```
원본 File 객체 + ArrayBuffer + Canvas 렌더링 버퍼(canvas-to-png 시) +
embedJpg/embedPng 결과 + PDFDocument 내부 버퍼 + save() Uint8Array
```

이미지 1장당 실제 메모리 사용량은 원본 파일 크기의 **3~5배** 수준.
단, `for` 루프로 순차 처리하므로 한 번에 하나의 이미지만 처리된다.
`PDFDocument` 객체는 모든 페이지를 메모리에 유지하므로 이미지 수가 많을수록 누적된다.

**실질적 제한:**
- 이미지 20장, 장당 평균 3MB → 원본 합계 60MB → 처리 중 최대 약 200~300MB 힙 사용 추정
- 고해상도 스캔 이미지(10MB+)가 많은 경우 메모리 부족 위험

**권장 정책:**
- 파일 개수 제한: 최대 50장
- 합산 파일 크기: 200MB warn / 500MB reject (기존 `checkFileSizePolicy` 재활용)
- 개별 파일 크기: 50MB warn / 100MB reject (이미지 전용 별도 정책 고려)

---

## 6. 이미지 유효성 검증

### 6.1 MIME 타입 + 확장자 검사

```typescript
const SUPPORTED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
])

const SUPPORTED_IMAGE_EXTS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'
])

export function validateImageFile(file: File): void {
  const mime = file.type.toLowerCase()
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''

  const mimeOk = SUPPORTED_IMAGE_MIMES.has(mime)
  const extOk = SUPPORTED_IMAGE_EXTS.has(ext)

  if (!mimeOk && !extOk) {
    throw new Error(
      `지원하지 않는 파일 형식이에요: ${file.name}\n` +
      `JPG, PNG, WebP, GIF, BMP 파일만 업로드할 수 있어요.`
    )
  }
}
```

### 6.2 손상된 이미지 감지

이미지 손상은 두 단계에서 감지된다:

**단계 1: `embedJpg` / `embedPng` 예외**
pdf-lib가 이미지 바이트를 파싱할 때 오류가 발생하면 예외를 던진다.

```typescript
try {
  const image = await doc.embedJpg(imageBytes)
} catch (e) {
  throw new Error(`이미지를 읽을 수 없어요: ${file.name}\n파일이 손상되었을 수 있어요.`)
}
```

**단계 2: Canvas `img.onerror`**
Canvas API를 통한 변환(WebP, GIF, BMP) 시 브라우저가 디코딩에 실패하면 `onerror` 콜백이 호출된다. `convertToPng` 함수에 이미 포함되어 있다.

**단계 3: 이미지 크기 이상 감지**
변환 후 `naturalWidth` 또는 `naturalHeight`가 0이면 손상으로 판단한다.

```typescript
if (img.naturalWidth === 0 || img.naturalHeight === 0) {
  reject(new Error(`이미지 크기를 읽을 수 없어요: ${file.name}`))
  return
}
```

### 6.3 파일 크기 정책

이미지 전용 크기 정책을 별도로 정의하는 것을 권장한다.
PDF의 400~500MB 기준은 이미지에서 과도하게 관대하다.

```typescript
const MAX_IMAGE_SIZE = 50 * 1024 * 1024   // 50MB per image
const WARN_IMAGE_SIZE = 20 * 1024 * 1024  // 20MB per image
const MAX_TOTAL_IMAGE_SIZE = 200 * 1024 * 1024  // 200MB 합산

export function checkImageSizePolicy(file: File): FileSizePolicy {
  if (file.size > MAX_IMAGE_SIZE) return 'reject'
  if (file.size > WARN_IMAGE_SIZE) return 'warn'
  return 'ok'
}

export function checkTotalImageSizePolicy(files: File[]): FileSizePolicy {
  const total = files.reduce((sum, f) => sum + f.size, 0)
  if (total > MAX_TOTAL_IMAGE_SIZE) return 'reject'
  return 'ok'
}
```

---

## 7. 예외 케이스 정리

| 케이스 | 발생 시점 | 처리 방식 |
|--------|---------|---------|
| 지원 안 되는 포맷 (HEIC, TIFF, SVG 등) | 업로드 시 | `validateImageFile`에서 거부, 에러 메시지 |
| 손상된 JPEG/PNG | `embedJpg`/`embedPng` 시 | 예외 catch → 파일명 포함 에러 메시지 |
| 손상된 WebP/GIF/BMP | Canvas `onerror` 시 | 예외 catch → 파일명 포함 에러 메시지 |
| 0픽셀 크기 이미지 | Canvas 로드 후 | naturalWidth/Height 검사 후 에러 |
| 파일 크기 초과 (개별) | 업로드 시 | `checkImageSizePolicy`에서 거부 |
| 합산 파일 크기 초과 | 실행 전 | `checkTotalImageSizePolicy`에서 거부 |
| 이미지 0개 | 실행 전 | "이미지 파일을 1개 이상 추가해 주세요." |
| PNG에 투명도(알파채널) | 없음 — pdf-lib embedPng가 처리 | 정상 처리 (배경 없이 임베딩) |

### 7.1 PNG 투명 배경 처리

PDF는 기본적으로 흰색 배경을 가진다.
PNG의 투명 영역은 PDF 뷰어에서 **배경 없이**(투명하게) 표시된다.
A4 모드에서 배경을 흰색으로 채우려면 `drawRectangle`로 흰색 사각형을 먼저 그릴 수 있다.

```typescript
// 선택 사항: 흰색 배경 추가 (A4 모드)
import { rgb } from 'pdf-lib'

page.drawRectangle({
  x: 0, y: 0,
  width: A4_WIDTH, height: A4_HEIGHT,
  color: rgb(1, 1, 1),
})
page.drawImage(image, { x, y, width: drawW, height: drawH })
```

MVP에서는 흰색 배경 추가 여부를 UX 팀과 협의하여 결정한다.
기본값으로 **흰색 배경 추가를 권장**한다 (인쇄 시 투명 배경이 검게 나오는 뷰어 존재).

---

## 8. 파일명 생성 규칙

| 케이스 | 파일명 규칙 | 예시 |
|--------|-----------|------|
| 이미지 1장 | `{원본파일명(확장자 제외)}.pdf` | `photo.pdf` |
| 이미지 복수 장 | `images.pdf` | `images.pdf` |

---

## 9. 기존 코드와의 공통점/차이점

### 9.1 공통점

| 항목 | Image to PDF | 기존 기능 |
|------|-------------|---------|
| `PDFDocument.create()` | 사용 | 사용 |
| `doc.save()` → `Uint8Array` | 사용 | 사용 |
| `checkFileSizePolicy` | 재활용 (합산 크기) | 사용 |
| 에러 패턴 (try-catch + 한국어 메시지) | 동일 | 동일 |

### 9.2 차이점

| 항목 | Image to PDF | 기존 기능 |
|------|-------------|---------|
| 입력 파일 타입 | `image/*` | `application/pdf` |
| 사용 API | `embedJpg`, `embedPng`, `drawImage` | `copyPages`, `addPage` |
| 변환 단계 추가 | Canvas API (WebP/GIF/BMP) | 없음 |
| 페이지 크기 결정 | 이미지 크기 기반 계산 | 소스 PDF에서 복사 |
| `validateFileType` 재활용 | 불가 (PDF 전용) | 재활용 |
| 신규 검증 함수 필요 | `validateImageFile`, `checkImageSizePolicy` | 기존 재활용 |

---

## 10. 구현 체크리스트 (개발팀 전달)

### 10.1 신규 구현 파일

- [ ] `src/lib/pdf/imageToPdf.ts` — 핵심 변환 로직
  - `imagesToPdf(files, mode)` — 메인 함수
  - `fitImageToA4(doc, image)` — A4 배치 로직
  - `buildPageFromImageOriginalSize(doc, image)` — 원본 크기 로직
  - `convertToPng(file)` — Canvas 변환 로직
  - `detectImageFormat(file)` — 포맷 판별

- [ ] `src/lib/pdf/validateImage.ts` — 이미지 전용 검증
  - `validateImageFile(file)` — MIME/확장자 검사
  - `checkImageSizePolicy(file)` — 개별 크기 정책
  - `checkTotalImageSizePolicy(files)` — 합산 크기 정책

### 10.2 타입 추가

- [ ] `src/types/pdf.ts`에 추가
  - `PageSizeMode = 'a4' | 'original'`
  - `ImageFileItem { id, file, previewUrl? }` — UI 미리보기용 (선택)
  - `ActiveTab`에 `'image-to-pdf'` 추가

### 10.3 주의사항

- `page.drawImage()`의 `y` 좌표는 **좌하단 원점** 기준. 중앙 정렬 계산 시 반드시 확인.
- `URL.createObjectURL(file)` 사용 후 반드시 `URL.revokeObjectURL(url)` 호출 (메모리 누수 방지).
- `canvas.toBlob()`은 비동기 + 콜백 방식. Promise로 래핑 필요.
- `embedJpg`는 Progressive JPEG도 지원하지만, 일부 손상된 JPEG에서 예외 없이 빈 이미지가 임베딩될 수 있다. QA 시 다양한 JPEG 형식으로 테스트 필요.
- EXIF orientation 데이터: pdf-lib `embedJpg`는 EXIF orientation을 자동 적용하지 않는다. 스마트폰으로 찍은 세로 사진이 가로로 표시될 수 있다. MVP에서는 미처리(EXIF 무시)로 결정하고 차후 개선으로 남긴다.

---

## 11. EXIF Orientation 이슈 (중요 제약사항)

### 11.1 문제

스마트폰 카메라로 찍은 JPEG 사진은 물리적 방향과 무관하게 특정 방향으로 저장되고, EXIF 메타데이터의 Orientation 태그로 회전 정보를 표시한다.
브라우저 `<img>` 태그와 CSS는 EXIF orientation을 자동 적용하지만, pdf-lib `embedJpg`는 **EXIF를 무시**한다.

**결과:** 세로로 찍은 사진이 PDF에서 90° 회전된 상태로 삽입될 수 있다.

### 11.2 MVP 정책

**EXIF orientation 처리를 MVP에서 제외한다.**
- 구현 복잡도: EXIF 파싱 라이브러리(`exifr` 등) 추가 필요
- 대상: 주로 스마트폰 JPEG에만 해당
- 대안: Canvas API를 통한 변환 시 브라우저가 EXIF를 적용하므로 `convertToPng` 경유 시 자동 해결됨

**우회 방법 (Canvas 활용):**
모든 이미지를 Canvas를 통해 변환하면 브라우저가 EXIF orientation을 적용한 상태로 렌더링하므로 문제가 해결된다.
단, 모든 이미지를 Canvas 경유로 처리하면 JPG→PNG 변환으로 파일 크기가 증가한다.

**권장:** MVP에서는 EXIF 이슈를 알려진 제약사항으로 문서화하고, 이후 단계에서 `exifr` 라이브러리 추가를 검토한다.

---

## 12. 요약

| 항목 | 결정 |
|------|------|
| 직접 지원 포맷 | JPG, PNG (`embedJpg`, `embedPng`) |
| 변환 지원 포맷 | WebP, GIF, BMP (Canvas API → PNG → `embedPng`) |
| 미지원 포맷 | HEIC, TIFF, SVG — 업로드 시 거부 |
| 기본 페이지 크기 | A4 (595.28 × 841.89 pt), 여백 40pt, 비율 유지 중앙 정렬 |
| 투명 배경 처리 | 흰색 배경 사각형 먼저 그리기 권장 |
| EXIF orientation | MVP 미처리 (알려진 제약사항으로 문서화) |
| 메모리 정책 | 개별 50MB reject / 합산 200MB reject |
| 신규 파일 | `imageToPdf.ts`, `validateImage.ts` |
| 신규 타입 | `PageSizeMode`, `ActiveTab`에 `'image-to-pdf'` 추가 |

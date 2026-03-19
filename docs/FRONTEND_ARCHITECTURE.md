# 프론트엔드 아키텍처 설계: vibe-pdf

**버전**: 1.6
**작성일**: 2026-03-19
**작성자**: Frontend Architect
**상태**: Confirmed
**참조**: PRD v1.4, PDF_DOMAIN_SPEC v1.0.0, PDF_EXTRACT_DELETE_SPEC v1.0.0, PDF_ROTATE_REORDER_SPEC v1.0.0, PDF_ENCRYPT_SPEC v1.0.0, PDF_IMAGE_TO_PDF_SPEC v1.0.0, ux-extract-delete.md, ux-rotate-reorder.md, ux-password-protect.md, ux-image-to-pdf.md
**변경 이력**:
- v1.0 (2026-03-18): 초기 설계 (Merge, Split)
- v1.1 (2026-03-19): Extract, Delete 아키텍처 추가
- v1.2 (2026-03-19): UX/UI 설계 반영, PageRangeInput 위치 확정, 마이크로카피 통합
- v1.3 (2026-03-19): Rotate, Reorder 아키텍처 추가 (탭 6개, dnd-kit PageCardList)
- v1.4 (2026-03-19): useReorder canExecute 조건 변경 — 순서 변경 없으면 저장 버튼 비활성
- v1.5 (2026-03-19): Password Protect 아키텍처 추가 (탭 7개, pdf-lib-plus-encrypt, PasswordInput)
- v1.6 (2026-03-19): Image to PDF 아키텍처 추가 (탭 8개, ImageCard/ImageCardList/PageSizePicker, Canvas API)

---

## 1. 기술 스택 확정안

| 항목 | 선택 | 버전 |
|------|------|------|
| 프레임워크 | React | ^18.3 |
| 언어 | TypeScript | ^5.5 |
| 빌드 도구 | Vite | ^5.4 |
| 스타일링 | Tailwind CSS | ^3.4 |
| UI 컴포넌트 | shadcn/ui | latest |
| PDF 처리 (일반) | pdf-lib | ^1.17.1 |
| PDF 암호화 | pdf-lib-plus-encrypt | latest |
| ZIP 생성 | JSZip | ^3.10 |
| 드래그 앤 드롭 | @dnd-kit/core + @dnd-kit/sortable | ^6.x |
| 상태 관리 | React useState / useReducer (Context 없음) | built-in |
| 패키지 매니저 | npm | - |

Image to PDF는 추가 라이브러리 없음. pdf-lib `embedJpg`/`embedPng` + 브라우저 내장 Canvas API 활용.

---

## 2. 선정 이유

### React + TypeScript + Vite
- PRD와 도메인 명세에서 이미 전제된 스택이다.
- Vite는 빠른 HMR과 tree-shaking으로 번들 크기 2MB 이하 목표 달성에 유리하다.

### Tailwind CSS + shadcn/ui
- shadcn/ui는 Radix UI 기반으로 접근성(키보드 내비게이션)이 내장되어 있다.
- 컴포넌트를 직접 소유(copy-paste 방식)하므로 번들에 사용하지 않는 컴포넌트가 포함되지 않는다.

### pdf-lib (기존 기능 + Image to PDF)
- 브라우저에서 순수 JS로 동작하며 서버 의존성이 없다.
- Image to PDF에서 `embedJpg()`, `embedPng()`, `drawImage()` API 활용.

### pdf-lib-plus-encrypt (Password Protect 전용)
- pdf-lib는 암호화를 지원하지 않는다(GitHub 이슈 #394).
- pdf-lib-plus-encrypt는 pdf-lib 포크로 AES-256 암호화를 추가 지원한다.
- 순수 JS, WASM 없음 — Web Worker 불필요. Vite 빌드 설정 변경 없음.
- 기존 pdf-lib import와 경로가 분리되므로 공존 가능.

### Canvas API (Image to PDF — 브라우저 내장)
- WebP, GIF, BMP → PNG 변환에 사용. 추가 라이브러리 없음.
- `URL.createObjectURL()` + `<img>` + `canvas.toBlob()` 패턴.
- EXIF orientation을 브라우저가 자동 적용하므로 Canvas 경유 이미지는 회전 이슈 없음.

### JSZip
- Split 결과물 다중 파일 ZIP 다운로드에 필요하다.

### @dnd-kit
- Merge(FileList), Reorder(PageCardList), Image to PDF(ImageCardList) 세 곳에서 재활용.
- 동일 라이브러리를 공유하므로 추가 번들 비용 없음.
- 키보드 접근성(Space + 화살표 키 드래그)이 내장되어 있다.

### 상태 관리: Context/Redux 없음
- MVP 기능 8개 모두 탭 간 공유 상태가 없다.

---

## 3. 폴더 구조

```
vibe-pdf/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx                    # Vite 진입점
│   ├── App.tsx                     # 탭 라우팅, 최상위 레이아웃
│   ├── vite-env.d.ts
│   │
│   ├── components/                 # 공통 UI 컴포넌트
│   │   ├── ui/                     # shadcn/ui 복사 컴포넌트 (직접 수정 금지)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── alert.tsx
│   │   │   └── badge.tsx
│   │   ├── FileDropZone.tsx        # 드래그앤드롭 파일 업로드 영역 (accept prop 주입)
│   │   ├── LoadingOverlay.tsx      # 처리 중 로딩 인디케이터
│   │   └── ErrorMessage.tsx        # 에러 메시지 표시
│   │
│   ├── features/
│   │   ├── merge/                  # PDF 병합
│   │   │   ├── MergePage.tsx
│   │   │   ├── FileList.tsx        # @dnd-kit 파일 재정렬 목록
│   │   │   ├── FileListItem.tsx
│   │   │   ├── OutputNameInput.tsx
│   │   │   └── useMerge.ts
│   │   │
│   │   ├── split/                  # PDF 분할
│   │   │   ├── SplitPage.tsx
│   │   │   ├── SplitModeSelector.tsx
│   │   │   ├── PageRangeInput.tsx  # Split / Extract / Delete / Rotate 4곳에서 공유
│   │   │   └── useSplit.ts
│   │   │
│   │   ├── extract/                # PDF 페이지 추출
│   │   │   ├── ExtractPage.tsx
│   │   │   └── useExtract.ts
│   │   │
│   │   ├── delete/                 # PDF 페이지 삭제
│   │   │   ├── DeletePage.tsx
│   │   │   └── useDelete.ts
│   │   │
│   │   ├── rotate/                 # PDF 페이지 회전
│   │   │   ├── RotatePage.tsx
│   │   │   ├── RotateDegreeSelector.tsx
│   │   │   └── useRotate.ts
│   │   │
│   │   ├── reorder/                # PDF 페이지 순서 변경
│   │   │   ├── ReorderPage.tsx
│   │   │   ├── PageCardList.tsx    # @dnd-kit 기반 드래그 페이지 카드 목록
│   │   │   ├── PageCard.tsx
│   │   │   └── useReorder.ts
│   │   │
│   │   ├── encrypt/                # PDF 암호화
│   │   │   ├── PasswordProtectPage.tsx
│   │   │   ├── PasswordInput.tsx   # 비밀번호 입력 + 보기/숨기기 토글
│   │   │   └── usePasswordProtect.ts
│   │   │
│   │   └── image-to-pdf/           # 이미지 → PDF 변환 (신규 — v1.6)
│   │       ├── ImageToPdfPage.tsx  # 메인 페이지 루트
│   │       ├── ImageCardList.tsx   # @dnd-kit 기반 이미지 카드 목록
│   │       ├── ImageCard.tsx       # 썸네일 + 파일명 + 드래그 핸들 + X 버튼
│   │       ├── PageSizePicker.tsx  # A4 / Letter / 원본 크기 라디오 선택
│   │       └── useImageToPdf.ts    # 이미지 목록/변환 상태/로직 훅
│   │
│   ├── lib/                        # PDF 처리 순수 함수
│   │   ├── pdf/
│   │   │   ├── merge.ts            # mergePDFs(), getPdfPageCount()
│   │   │   ├── split.ts            # extractPages(), splitAllPages(), splitByRanges(), deletePages()
│   │   │   ├── rotate.ts           # rotatePages()
│   │   │   ├── reorder.ts          # reorderPages()
│   │   │   ├── protect.ts          # protectPDF() (pdf-lib-plus-encrypt)
│   │   │   ├── imageToPdf.ts       # imagesToPdf(), fitImageToPage(), convertToPng() (신규 — v1.6)
│   │   │   ├── validate.ts         # validateFileType(), checkSingleFileSizePolicy(), validatePageCount(), isEncryptedPDF()
│   │   │   ├── validateImage.ts    # validateImageFile(), checkImageSizePolicy(), checkTotalImageSizePolicy() (신규 — v1.6)
│   │   │   └── pageRange.ts        # parsePageRanges(), parseRangesIntoGroups(), validateRangeInput()
│   │   └── download.ts             # downloadPDF(), downloadZip()
│   │
│   ├── types/
│   │   └── pdf.ts                  # 공유 타입 정의
│   │
│   └── styles/
│       └── globals.css
│
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### v1.6 폴더 구조 변경 사항

| 항목 | 변경 내용 |
|------|----------|
| `features/image-to-pdf/` | 신규: ImageToPdfPage, ImageCardList, ImageCard, PageSizePicker, useImageToPdf |
| `lib/pdf/imageToPdf.ts` | 신규: `imagesToPdf()`, `fitImageToPage()`, `convertToPng()` |
| `lib/pdf/validateImage.ts` | 신규: `validateImageFile()`, `checkImageSizePolicy()`, `checkTotalImageSizePolicy()` |
| `components/FileDropZone.tsx` | `accept` prop 외부 주입 방식으로 변경 (기존 `.pdf` 고정 → 이미지 전용 모드 지원) |

---

## 4. 주요 컴포넌트 구조

### 4.1 App.tsx — 최상위 레이아웃

```typescript
type Tab = 'merge' | 'split' | 'extract' | 'delete' | 'rotate' | 'reorder' | 'encrypt' | 'image-to-pdf'

const tabs: { id: Tab; label: string }[] = [
  { id: 'merge',        label: '병합 (Merge)'           },
  { id: 'split',        label: '분할 (Split)'           },
  { id: 'extract',      label: '추출 (Extract)'         },
  { id: 'delete',       label: '삭제 (Delete)'          },
  { id: 'rotate',       label: '회전 (Rotate)'          },
  { id: 'reorder',      label: '순서 바꾸기 (Reorder)'  },
  { id: 'encrypt',      label: '암호화 (Protect)'       },
  { id: 'image-to-pdf', label: '이미지→PDF'              },
]
```

```
App
├── 헤더 (제품명 + 프라이버시 뱃지)
├── 탭 바 (overflow-x-auto scrollbar-hide — 8개 탭)
│   ├── MergePage
│   ├── SplitPage
│   ├── ExtractPage
│   ├── DeletePage
│   ├── RotatePage
│   ├── ReorderPage
│   ├── PasswordProtectPage
│   └── ImageToPdfPage
└── 푸터
```

- 탭 바 클래스: `flex border-b border-gray-200 overflow-x-auto scrollbar-hide`
- 탭 전환 시 각 기능 컴포넌트 언마운트 → 상태 자동 초기화 (썸네일 URL revoke 포함).

### 4.2~4.9 기존 기능 페이지 (변경 없음)

MergePage, SplitPage, ExtractPage, DeletePage, RotatePage, ReorderPage, PasswordProtectPage — v1.5 내용 그대로 유지.

### 4.10 ImageToPdfPage.tsx (신규 — v1.6)

```
ImageToPdfPage
├── [images.length === 0] FileDropZone (
│     multiple=true,
│     accept=".jpg,.jpeg,.png,.webp,.gif,.bmp",
│     title="이미지를 여기에 드래그하거나"
│   )
├── [images.length > 0] 이미지 카드 섹션
│   ├── 섹션 헤더: "이미지 목록 ({N}개)"
│   ├── ImageCardList (@dnd-kit)
│   │   └── ImageCard[] (각 카드: 썸네일 + 파일명 + 크기/에러 + 드래그 핸들 + X)
│   └── "이미지 추가" 보조 버튼 (hidden input[file] trigger)
├── [images.length > 0] PageSizePicker (value=pageSize, onChange=setPageSize)
│   ├── (●) A4 (210 × 297mm) — 기본값
│   ├── (○) Letter (216 × 279mm)
│   └── (○) 이미지 원본 크기
├── OutputNameInput (기본값: 1장→"{원본명}", 복수→"images")
├── [totalSizeExceeded] 합산 크기 초과 에러 배너
├── Button ("PDF 만들기" | "변환 중이에요...")
├── 신뢰 배지: "[Lock] 파일이 서버로 전송되지 않아요"
├── [status === 'done'] 완료 카드
│   ├── CheckCircle "PDF 변환 완료!"
│   ├── "{outputName}.pdf ({N}페이지)"
│   ├── "파일이 자동으로 다운로드 되었어요."
│   ├── Button "다시 다운로드"
│   └── Button "새 작업 시작" (썸네일 URL revoke 포함)
└── [status === 'error'] 에러 카드 (role="alert")
    ├── AlertCircle "PDF 변환 중 오류가 발생했어요."
    ├── {errorMessage}
    └── Button "다시 시도" (status → idle, 이미지 목록 유지)
```

`useImageToPdf` 훅이 모든 상태와 핸들러를 제공한다.

### 4.11 ImageCardList.tsx (신규 — v1.6)

FileList/PageCardList 패턴 기반 @dnd-kit SortableContext.

```typescript
interface ImageCardListProps {
  images: ImageItem[]
  onReorder: (fromIndex: number, toIndex: number) => void
  onRemove: (id: string) => void
  disabled?: boolean
}
```

- `DndContext` + `SortableContext(verticalListSortingStrategy)` + `DragOverlay`
- 에러 카드(`item.error` 존재)는 `useSortable`의 `disabled={true}` 설정 → 드래그 불가
- 컨테이너: `max-h-[480px] overflow-y-auto` (이미지 많을 때 대응)

### 4.12 ImageCard.tsx (신규 — v1.6)

```typescript
interface ImageCardProps {
  id: string
  file: File
  previewUrl: string         // URL.createObjectURL 결과 (에러 시 '')
  error?: string             // 미지원/손상/크기 초과 에러 메시지
  sizeWarning?: string       // 20MB~50MB 경고 메시지
  isGif?: boolean            // GIF 애니메이션 안내 표시용
  onRemove: (id: string) => void
  disabled?: boolean
}
```

레이아웃:
```
<div ref={setNodeRef} style={style}
     className={cn(
       "flex items-center gap-3 rounded-md border px-3 py-2.5",
       error ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"
     )}>

  {/* 드래그 핸들 (에러 카드에서 숨김) */}
  {!error && (
    <div {...attributes} {...listeners} aria-label={`${file.name} 순서 변경`}
         className="cursor-grab">
      <GripVertical className="h-5 w-5 text-gray-400" />
    </div>
  )}

  {/* 썸네일 or 에러 아이콘 */}
  {previewUrl && !error
    ? <img src={previewUrl} alt={file.name} className="h-14 w-14 rounded object-cover flex-shrink-0" />
    : <div className="h-14 w-14 rounded bg-red-100 flex items-center justify-center flex-shrink-0">
        <AlertCircle className="h-6 w-6 text-red-400" />
      </div>
  }

  {/* 파일 정보 */}
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium truncate">{file.name}</p>
    {!error && <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>}
    {sizeWarning && <p className="text-xs text-amber-600">{sizeWarning}</p>}
    {isGif && !error && (
      <p className="text-xs text-gray-500">애니메이션 GIF는 첫 번째 프레임만 사용돼요.</p>
    )}
    {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
  </div>

  {/* X 버튼 */}
  <button type="button" onClick={() => onRemove(id)}
          aria-label={`${file.name} 제거`} disabled={disabled}>
    <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
  </button>
</div>
```

### 4.13 PageSizePicker.tsx (신규 — v1.6)

SplitModeSelector / RotateDegreeSelector 패턴 기반 라디오 그룹.

```typescript
interface PageSizePickerProps {
  value: PageSizeMode    // 'a4' | 'letter' | 'original'
  onChange: (value: PageSizeMode) => void
  disabled?: boolean
}
```

```
<fieldset>
  <legend>페이지 크기</legend>
  [라디오] A4            (●) 210 × 297mm · 인쇄에 적합 (기본값)
  [라디오] Letter        (○) 216 × 279mm · 미국 표준
  [라디오] 이미지 원본 크기 (○) 각 이미지의 픽셀 크기를 그대로 사용
</fieldset>
```

- 선택 시 스타일: `border-blue-500 bg-blue-50`
- "원본 크기" 선택 시 힌트: `이미지마다 페이지 크기가 다를 수 있어요.` (선택 상태에서만 표시)

### 4.14~4.20 기존 컴포넌트 (변경 없음 또는 소폭 변경)

**FileDropZone.tsx — `accept` prop 외부 주입 변경 (v1.6)**

기존 PDF 기능들은 `accept=".pdf"` (기본값), Image to PDF는 `accept=".jpg,.jpeg,.png,.webp,.gif,.bmp"` 전달.

```typescript
interface FileDropZoneProps {
  accept?: string    // 기본값: ".pdf" — 기존 기능 영향 없음
  multiple?: boolean
  title?: string
  // ... 기타 기존 props
}
```

PasswordInput, PageRangeInput, OutputNameInput, RotateDegreeSelector, PageCardList, PageCard — v1.5 내용 그대로 유지.

---

## 5. 주요 도메인 타입 정의

```typescript
// src/types/pdf.ts

export interface PdfFileItem {
  id: string
  file: File
  pageCount: number
}

export type SplitMode = 'all' | 'range'
export type FileSizePolicy = 'ok' | 'warn' | 'reject'

/**
 * 'wasm-init': 향후 WASM 엔진 교체 대비 (현재 미사용)
 */
export type ProcessingStatus = 'idle' | 'wasm-init' | 'processing' | 'done' | 'error'

export interface PageRangeGroup {
  label: string
  indices: number[]
}

/** v1.1~v1.6 누적 */
export type ActiveTab =
  | 'merge' | 'split' | 'extract' | 'delete'
  | 'rotate' | 'reorder' | 'encrypt' | 'image-to-pdf'

/** v1.3 — Rotate 기능용 */
export type RotateDegree = 90 | 180 | 270

export interface PageRotation {
  pageIndex: number       // 0-based
  rotateDegrees: RotateDegree
}

/** v1.3 — Reorder 기능용 */
export interface PageItem {
  id: string              // dnd-kit 식별자 (고정)
  originalIndex: number   // 0-based, 불변
  originalPageNumber: number  // 1-based, 표시용, 불변
}

/** v1.6 신규 — Image to PDF 기능용 */
export type PageSizeMode = 'a4' | 'letter' | 'original'

export interface ImageItem {
  id: string              // nanoid() 등으로 생성, dnd-kit 식별자
  file: File
  previewUrl: string      // URL.createObjectURL(file), 에러 시 ''
  error?: string          // 미지원/손상/크기 초과 에러 메시지
  sizeWarning?: string    // 20MB~50MB 경고 메시지
  isGif?: boolean         // GIF 애니메이션 안내 표시용
}
```

---

## 6. 상태 관리 전략

### 원칙

- 전역 상태 라이브러리를 사용하지 않는다.
- 각 기능은 독립적인 상태를 가진다. 탭 전환 시 자동 초기화.
- 복잡한 상태 로직은 커스텀 훅으로 캡슐화한다.

### useMerge / useSplit / useExtract / useDelete / useRotate / useReorder / usePasswordProtect

v1.5 내용 그대로 유지.

### useImageToPdf 훅 (신규 — v1.6)

```typescript
interface UseImageToPdfReturn {
  // 이미지 목록
  images: ImageItem[]

  // 설정
  pageSize: PageSizeMode    // 기본값: 'a4'
  outputName: string        // 1장→"{원본명}", 복수→"images", 사용자 수정 시 isDirty=true

  // 처리 상태
  status: ProcessingStatus  // 'idle' | 'processing' | 'done' | 'error'
  error: string | null
  resultBlob: Blob | null   // 완료 후 재다운로드용
  resultPageCount: number | null

  // 액션
  addImages: (files: File[]) => void
  removeImage: (id: string) => void
  reorderImages: (fromIndex: number, toIndex: number) => void
  setPageSize: (mode: PageSizeMode) => void
  setOutputName: (name: string) => void
  handleConvert: () => Promise<void>
  handleRetryDownload: () => void
  reset: () => void         // 전체 초기화 (썸네일 URL revoke 포함)

  /**
   * images.some(img => !img.error)       // 유효한 이미지가 1개 이상
   * && !images.some(img => !!img.error)  // 에러 카드 없음
   * && outputName.trim().length > 0
   * && status === 'idle'
   */
  canExecute: boolean
}
```

**이미지 추가 처리 (addImages):**
```typescript
// 1. MIME/확장자 검사 → error 설정
// 2. 개별 크기 정책 (50MB 초과 → error)
// 3. 20MB~50MB → sizeWarning 설정
// 4. GIF 파일 → isGif=true 설정
// 5. 유효한 이미지 → URL.createObjectURL(file) → previewUrl 설정
// 6. 출력 파일명 자동 갱신 (isDirty=false 시)
```

**출력 파일명 자동 갱신:**
```typescript
// isDirty=false인 경우에만 자동 갱신
const validImages = images.filter(img => !img.error)
outputName = validImages.length === 1
  ? validImages[0].file.name.replace(/\.[^.]+$/, '')
  : 'images'
```

**썸네일 URL 생명주기:**
```typescript
// removeImage: URL.revokeObjectURL(item.previewUrl)
// reset: images.forEach(img => img.previewUrl && URL.revokeObjectURL(img.previewUrl))
// useEffect cleanup: 탭 전환(언마운트) 시 자동 revoke
useEffect(() => {
  return () => {
    images.forEach(img => img.previewUrl && URL.revokeObjectURL(img.previewUrl))
  }
}, [])
```

**canExecute 계산:**
```typescript
const hasValidImages = images.some(img => !img.error)
const hasErrorImages = images.some(img => !!img.error)
const canExecute = hasValidImages && !hasErrorImages
  && outputName.trim().length > 0
  && status === 'idle'
```

### 상태 흐름 (Image to PDF)

```
사용자 이미지 추가
    ↓
useImageToPdf.addImages()
    ↓ (검증 + previewUrl 생성)
ImageCardList 렌더 (썸네일 표시)
    ↓
handleConvert() 호출
    ↓ status = 'processing'
lib/pdf/imageToPdf.imagesToPdf(validFiles, pageSize)
    ↓ (각 이미지: embedJpg/embedPng or convertToPng → fitImageToPage or buildOriginalPage)
lib/download.downloadPDF(bytes, outputName)
    ↓ status = 'done'
완료 카드 표시
```

---

## 7. PDF 처리 유틸 구조

### 7.1~7.8 기존 유틸 (변경 없음)

`merge.ts`, `split.ts`, `rotate.ts`, `reorder.ts`, `protect.ts`, `validate.ts`, `pageRange.ts`, `download.ts` — v1.5 내용 그대로 유지.

### 7.9 src/lib/pdf/imageToPdf.ts (신규 — v1.6)

```typescript
import { PDFDocument, rgb } from 'pdf-lib'
import type { PageSizeMode } from '@/types/pdf'

/** A4: 595.28 × 841.89 pt, Letter: 612 × 792 pt */
const PAGE_SIZES = {
  a4:     { width: 595.28, height: 841.89 },
  letter: { width: 612,    height: 792    },
}
const MARGIN = 40  // pt

/**
 * 이미지 파일 배열을 멀티페이지 PDF로 변환.
 * files는 error 없는 유효한 이미지만 전달해야 한다 (훅에서 사전 필터링).
 */
export async function imagesToPdf(files: File[], mode: PageSizeMode): Promise<Uint8Array>

/**
 * A4 또는 Letter 페이지에 이미지를 비율 유지 + 중앙 fit 배치.
 * 흰색 배경 사각형 먼저 그린 후 이미지 draw.
 * 확대는 하지 않음 (scale ≤ 1.0).
 */
function fitImageToPage(doc: PDFDocument, image: PDFImage, mode: 'a4' | 'letter'): void

/**
 * 이미지 픽셀 크기 = 페이지 크기로 생성.
 */
function buildPageFromImageOriginalSize(doc: PDFDocument, image: PDFImage): void

/**
 * WebP / GIF / BMP → Canvas API → PNG Uint8Array.
 * img.naturalWidth/Height 0 체크 포함.
 * URL.createObjectURL + revokeObjectURL 처리 포함.
 */
export async function convertToPng(file: File): Promise<Uint8Array>

/**
 * MIME 타입 + 확장자로 포맷 판별.
 * 반환값: 'jpg' | 'png' | 'canvas-to-png' | 'unsupported'
 */
export function detectImageFormat(file: File): 'jpg' | 'png' | 'canvas-to-png' | 'unsupported'
```

**구현 주의사항:**
- pdf-lib 좌표계: 좌하단 원점(0,0). 중앙 배치 y 계산: `(pageH - drawH) / 2`
- A4/Letter 모드: `page.drawRectangle({ x:0, y:0, width:pageW, height:pageH, color:rgb(1,1,1) })` → 흰색 배경 먼저
- `canvas.toBlob()` 비동기 콜백 → Promise 래핑 필요
- EXIF orientation: Canvas 경유 이미지는 브라우저 자동 적용. JPG/PNG 직접 임베딩은 미처리 (알려진 제약사항)

### 7.10 src/lib/pdf/validateImage.ts (신규 — v1.6)

```typescript
const SUPPORTED_MIMES = new Set(['image/jpeg','image/png','image/webp','image/gif','image/bmp'])
const SUPPORTED_EXTS = new Set(['jpg','jpeg','png','webp','gif','bmp'])

/**
 * MIME 타입 + 확장자 검사. 미지원 시 에러 throw.
 */
export function validateImageFile(file: File): void

/**
 * 개별 이미지 크기 정책.
 * >50MB → 'reject', >20MB → 'warn', else → 'ok'
 */
export function checkImageSizePolicy(file: File): FileSizePolicy

/**
 * 합산 이미지 크기 정책.
 * >200MB → 'reject', else → 'ok'
 */
export function checkTotalImageSizePolicy(files: File[]): FileSizePolicy
```

---

## 8. @dnd-kit 활용 방안

### 8.1 Merge의 FileList (기존)
### 8.2 Reorder의 PageCardList (기존)

v1.5 내용 그대로 유지.

### 8.3 Image to PDF의 ImageCardList (신규 — v1.6)

```typescript
// 이미지 카드 재정렬 — 동일한 1D 세로 리스트 패턴
DndContext (onDragEnd → reorderImages(fromIndex, toIndex))
  └── SortableContext (items=images.map(img => img.id), strategy=verticalListSortingStrategy)
        └── ImageCard[]
              └── [에러 카드] useSortable disabled={true}  ← 드래그 불가
              └── [정상 카드] useSortable 활성            ← 드래그 가능
        └── DragOverlay
```

**세 컴포넌트 비교:**

| 항목 | FileList (Merge) | PageCardList (Reorder) | ImageCardList (Image to PDF) |
|------|:---------------:|:---------------------:|:---------------------------:|
| 아이템 데이터 | `PdfFileItem` | `PageItem` | `ImageItem` |
| 썸네일 | 없음 | 없음 | 있음 (56×56px) |
| X 버튼 | 있음 | 없음 | 있음 |
| 에러 카드 | 없음 | 없음 | 있음 (드래그 비활성) |
| "추가" 보조 버튼 | 없음 (드롭존 재활용) | 없음 | 있음 (카드 목록 하단) |
| 컨테이너 높이 | 제한 없음 | max-h-[480px] | max-h-[480px] |
| DnD 패턴 | 동일 | 동일 | 동일 |

---

## 9. 에러 처리 전략

### 에러 발생 레이어별 처리

| 레이어 | 에러 유형 | 처리 방식 |
|--------|----------|----------|
| FileDropZone | PDF 아닌 파일 (PDF 기능들) | 즉시 거부 |
| FileDropZone | 이미지 아닌 파일 (Image to PDF) | accept 속성으로 OS 다이얼로그에서 필터 |
| 이미지 추가 | 미지원 형식 (HEIC, TIFF 등) | `error` 설정 → 에러 카드 표시, canExecute=false |
| 이미지 추가 | 개별 50MB 초과 | `error` 설정 → 에러 카드 표시 |
| 이미지 추가 | 개별 20~50MB | `sizeWarning` 설정 → 카드 내 경고 텍스트 |
| 변환 실행 전 | 합산 200MB 초과 | `handleConvert` 내에서 체크 → 에러 배너 표시 |
| handleConvert | pdf-lib embedJpg/embedPng 실패 | `status='error'`, 에러 카드 (role="alert") |
| handleConvert | Canvas convertToPng 실패 | `status='error'`, 에러 카드 |
| PageRangeInput | 형식/범위 오류 | 실시간 인라인 오류 (PDF 기능들) |
| useDelete | 삭제 후 0페이지 | `deleteAllWarning` 경고 배너 |
| useReorder | 순서 미변경 | `canExecute=false` |
| usePasswordProtect | 이미 암호화된 파일 | `fileError` → 파일 카드 내 에러 표시 |
| usePasswordProtect | 비밀번호 불일치 | `passwordMismatch=true` → PasswordInput error prop |

### Image to PDF 에러 처리 특이사항

- **에러 카드 존재 시 변환 불가**: 에러 카드가 목록에 있으면 `canExecute=false`. 사용자는 X 버튼으로 에러 카드를 제거해야 한다.
- **에러 카드 드래그 비활성**: `useSortable disabled={true}`. 순서 변환 대상 아님을 시각적으로 명확히.
- **에러 상태에서 "다시 시도"**: status → idle, 이미지 목록 유지. 파일/설정 재입력 불필요.
- **EXIF orientation**: MVP 미처리. 알려진 제약사항으로 문서화. Canvas 경유 이미지(WebP/GIF/BMP)는 자동 해결.

---

## 10. 성능 고려사항

### 번들 크기

| 항목 | 예상 크기(gzip) | 비고 |
|------|----------------|------|
| React + ReactDOM | ~45KB | |
| pdf-lib | ~250KB | Image to PDF에서도 활용 |
| pdf-lib-plus-encrypt | ~260KB | Password Protect 전용 |
| JSZip | ~25KB | |
| @dnd-kit | ~20KB | Merge + Reorder + Image to PDF 공유 |
| Tailwind CSS(purged) | ~10KB | |
| shadcn/ui 컴포넌트 | ~10KB | |
| 앱 코드 | ~65KB | Image to PDF 추가로 ~10KB 증가 예상 |
| **합계** | **~685KB** | 목표 2MB(~700KB gzip) 이내 |

Image to PDF는 추가 라이브러리 없음 — 번들 크기 증가 없음.

### Image to PDF 성능 — 이미지 수 대응

- `imagesToPdf` 내 `for` 루프로 순차 처리. 한 번에 하나의 이미지만 메모리에.
- 단, `PDFDocument`는 모든 페이지를 메모리에 유지 → 이미지 수 비례 메모리 증가.
- 50장 기준: 원본 합계 약 150MB → 처리 중 최대 500~750MB 힙 추정. 모바일 주의.
- 이미지 카드 목록 `max-h-[480px] overflow-y-auto` — 가상 스크롤 없이 DOM 렌더링 (50장 이하 허용 범위).

### 썸네일 메모리 관리

- `URL.createObjectURL()` 는 GC 대상이 아닌 명시적 revoke가 필요한 리소스.
- revoke 시점: 카드 제거 시, "새 작업 시작" 클릭 시, 컴포넌트 언마운트(`useEffect` cleanup) 시.
- 에러 카드는 `previewUrl = ''` → revoke 불필요.

---

## 11. 향후 확장 시 분리 가능한 포인트

### Web Worker 분리
`src/lib/pdf/*.ts` 순수 함수들은 UI 의존성이 없다. `Comlink`로 래핑하여 Web Worker로 이동 가능.
Image to PDF의 `imagesToPdf`와 Password Protect의 `protectPDF`가 무거운 경우 우선 대상.

### 추가 기능 (탭 추가)
`App.tsx` 탭 배열 + `features/` 신규 디렉토리 추가만으로 확장. 기존 코드 변경 없음.

### Image to PDF 고급 옵션
- EXIF orientation 자동 보정: `exifr` 라이브러리 추가, `imageToPdf.ts` 내부만 변경.
- 여백 설정: `MARGIN` 상수를 `PageSizePicker` props로 노출.
- 배경색 선택: `imageToPdf.ts`에 `backgroundColor` 파라미터 추가.

### PageSizePicker 공용화
현재 `features/image-to-pdf/` 내부. 향후 PDF 페이지 크기 조정 기능 추가 시 `components/`로 이동 고려.

### PasswordInput 컴포넌트 공용화
현재 `features/encrypt/` 내부. 비밀번호 입력 필요 기능 추가 시 `components/`로 이동.

---

## 12. 기능별 재활용 매핑

| 재활용 대상 | Merge | Split | Extract | Delete | Rotate | Reorder | Encrypt | Image to PDF |
|-----------|:-----:|:-----:|:-------:|:------:|:------:|:-------:|:-------:|:------------:|
| `FileDropZone` | O(multi) | O | O | O | O | O | O | O(multi, 이미지 accept) |
| `PageRangeInput` | - | O | O | O | O | - | - | - |
| `OutputNameInput` | O | - | - | - | O | O | O | O |
| `LoadingOverlay` | O | O | O | O | O | O | O | O |
| `ErrorMessage` | O | O | O | O | O | O | - | - |
| `PasswordInput` | - | - | - | - | - | - | O | - |
| `FileList` (@dnd-kit) | O | - | - | - | - | - | - | - |
| `PageCardList` (@dnd-kit) | - | - | - | - | - | O | - | - |
| `ImageCardList` (@dnd-kit) | - | - | - | - | - | - | - | O |
| `RotateDegreeSelector` | - | - | - | - | O | - | - | - |
| `PageSizePicker` | - | - | - | - | - | - | - | O |
| `mergePDFs()` | O | - | - | - | - | - | - | - |
| `getPdfPageCount()` | O | O | O | O | O | O | O | - |
| `extractPages()` | - | O | O | - | - | - | - | - |
| `splitAllPages()` | - | O | - | - | - | - | - | - |
| `splitByRanges()` | - | O | - | - | - | - | - | - |
| `deletePages()` | - | - | - | O | - | - | - | - |
| `rotatePages()` | - | - | - | - | O | - | - | - |
| `reorderPages()` | - | - | - | - | - | O | - | - |
| `protectPDF()` | - | - | - | - | - | - | O | - |
| `imagesToPdf()` | - | - | - | - | - | - | - | O |
| `isEncryptedPDF()` | - | - | - | - | - | - | O | - |
| `validateImageFile()` | - | - | - | - | - | - | - | O |
| `checkImageSizePolicy()` | - | - | - | - | - | - | - | O |
| `checkTotalImageSizePolicy()` | - | - | - | - | - | - | - | O |
| `parsePageRanges()` | - | O | O | O | O | - | - | - |
| `validateRangeInput()` | - | O | O | O | O | - | - | - |
| `validateFileType()` | O | O | O | O | O | O | O | - |
| `checkSingleFileSizePolicy()` | - | O | O | O | O | O | O | - |
| `downloadPDF()` | O | O(단일) | O | O | O | O | O | O |
| `downloadZip()` | - | O(다수) | - | - | - | - | - | - |

---

*이 문서는 Frontend Implementation 엔지니어의 구현 기준 문서로 사용된다.*

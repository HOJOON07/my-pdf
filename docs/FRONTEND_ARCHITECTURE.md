# 프론트엔드 아키텍처 설계: vibe-pdf

**버전**: 1.7
**작성일**: 2026-03-19
**작성자**: Frontend Architect
**상태**: Confirmed
**참조**: PRD v1.5, PDF_DOMAIN_SPEC v1.0.0, PDF_EXTRACT_DELETE_SPEC v1.0.0, PDF_ROTATE_REORDER_SPEC v1.0.0, PDF_ENCRYPT_SPEC v1.0.0, PDF_IMAGE_TO_PDF_SPEC v1.0.0, PDF_5FEATURES_SPEC.md, ux-extract-delete.md, ux-rotate-reorder.md, ux-password-protect.md, ux-image-to-pdf.md, ux-5features.md
**변경 이력**:
- v1.0 (2026-03-18): 초기 설계 (Merge, Split)
- v1.1 (2026-03-19): Extract, Delete 아키텍처 추가
- v1.2 (2026-03-19): UX/UI 설계 반영, PageRangeInput 위치 확정, 마이크로카피 통합
- v1.3 (2026-03-19): Rotate, Reorder 아키텍처 추가 (탭 6개, dnd-kit PageCardList)
- v1.4 (2026-03-19): useReorder canExecute 조건 변경 — 순서 변경 없으면 저장 버튼 비활성
- v1.5 (2026-03-19): Password Protect 아키텍처 추가 (탭 7개, pdf-lib-plus-encrypt, PasswordInput)
- v1.6 (2026-03-19): Image to PDF 아키텍처 추가 (탭 8개, ImageCard/ImageCardList/PageSizePicker, Canvas API)
- v1.7 (2026-03-19): Info, Remove Metadata, Add Page Numbers, Odd/Even 아키텍처 추가 (탭 12개, MetadataPanel 공통 컴포넌트, PagePositionPicker). Unlock MVP 제외 확정.

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

Info, Remove Metadata, Add Page Numbers, Odd/Even 모두 추가 라이브러리 없음. 기존 pdf-lib 활용.

---

## 2. 선정 이유

### React + TypeScript + Vite
- PRD와 도메인 명세에서 이미 전제된 스택이다.
- Vite는 빠른 HMR과 tree-shaking으로 번들 크기 2MB 이하 목표 달성에 유리하다.

### Tailwind CSS + shadcn/ui
- shadcn/ui는 Radix UI 기반으로 접근성(키보드 내비게이션)이 내장되어 있다.
- 컴포넌트를 직접 소유(copy-paste 방식)하므로 번들에 사용하지 않는 컴포넌트가 포함되지 않는다.

### pdf-lib (기존 기능 + v1.7 신규 4개 기능)
- 브라우저에서 순수 JS로 동작하며 서버 의존성이 없다.
- Info: `getTitle()`, `getAuthor()` 등 메타데이터 getter + ArrayBuffer 헤더에서 버전 직접 파싱.
- Remove Metadata: `PDFDocument.create()` + `copyPages()` 패턴으로 XMP stream 제외.
- Add Page Numbers: `page.drawText()` + `StandardFonts.Helvetica` + `font.widthOfTextAtSize()`.
- Odd/Even: 기존 `extractPages()` 재사용.

### pdf-lib-plus-encrypt (Password Protect 전용)
- pdf-lib는 암호화를 지원하지 않는다(GitHub 이슈 #394).
- pdf-lib-plus-encrypt는 pdf-lib 포크로 AES-256 암호화를 추가 지원한다.
- 순수 JS, WASM 없음 — Web Worker 불필요. Vite 빌드 설정 변경 없음.
- 기존 pdf-lib import와 경로가 분리되므로 공존 가능.

### Unlock 기능 — MVP 제외 확정
- pdf-lib: `PDFDocument.load()`에 password 옵션 없음. `ignoreEncryption: true`는 콘텐츠 손상.
- pdf-lib-plus-encrypt: 암호화 전용, 복호화 불가.
- qpdf WASM: `@cantoo/qpdf` npm 미존재, `qpdf.js` Vite 호환 이슈로 기각.
- 차기 릴리즈에서 qpdf WASM 빌드 환경 확보 후 추가 예정.

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
- MVP 기능 12개 모두 탭 간 공유 상태가 없다.

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
│   │   ├── ErrorMessage.tsx        # 에러 메시지 표시
│   │   └── MetadataPanel.tsx       # PDF 메타데이터 표시 패널 (신규 — v1.7, Info/RM 공유)
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
│   │   ├── image-to-pdf/           # 이미지 → PDF 변환 (신규 — v1.6)
│   │   │   ├── ImageToPdfPage.tsx
│   │   │   ├── ImageCardList.tsx   # @dnd-kit 기반 이미지 카드 목록
│   │   │   ├── ImageCard.tsx
│   │   │   ├── PageSizePicker.tsx
│   │   │   └── useImageToPdf.ts
│   │   │
│   │   ├── info/                   # PDF 문서 정보 (신규 — v1.7)
│   │   │   ├── InfoPage.tsx        # 읽기 전용, 다운로드 없음
│   │   │   └── useInfo.ts
│   │   │
│   │   ├── remove-metadata/        # 메타데이터 제거 (신규 — v1.7)
│   │   │   ├── RemoveMetadataPage.tsx
│   │   │   └── useRemoveMetadata.ts
│   │   │
│   │   ├── add-page-numbers/       # 페이지 번호 추가 (신규 — v1.7)
│   │   │   ├── AddPageNumbersPage.tsx
│   │   │   ├── PagePositionPicker.tsx  # 6개 위치 격자 UI
│   │   │   └── useAddPageNumbers.ts
│   │   │
│   │   └── odd-even/               # 홀수/짝수 페이지 추출 (신규 — v1.7)
│   │       ├── OddEvenPage.tsx
│   │       └── useOddEven.ts
│   │
│   ├── lib/                        # PDF 처리 순수 함수
│   │   ├── pdf/
│   │   │   ├── merge.ts            # mergePDFs(), getPdfPageCount()
│   │   │   ├── split.ts            # extractPages(), splitAllPages(), splitByRanges(), deletePages()
│   │   │   ├── rotate.ts           # rotatePages()
│   │   │   ├── reorder.ts          # reorderPages()
│   │   │   ├── protect.ts          # protectPDF() (pdf-lib-plus-encrypt)
│   │   │   ├── imageToPdf.ts       # imagesToPdf(), fitImageToPage(), convertToPng()
│   │   │   ├── info.ts             # getPdfInfo() (신규 — v1.7)
│   │   │   ├── metadata.ts         # removeMetadata() (신규 — v1.7)
│   │   │   ├── pageNumbers.ts      # addPageNumbers() (신규 — v1.7)
│   │   │   ├── oddEven.ts          # extractOddOrEvenPages() (신규 — v1.7)
│   │   │   ├── validate.ts         # validateFileType(), checkSingleFileSizePolicy(), validatePageCount(), isEncryptedPDF()
│   │   │   ├── validateImage.ts    # validateImageFile(), checkImageSizePolicy(), checkTotalImageSizePolicy()
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

### v1.7 폴더 구조 변경 사항

| 항목 | 변경 내용 |
|------|----------|
| `features/info/` | 신규: InfoPage, useInfo |
| `features/remove-metadata/` | 신규: RemoveMetadataPage, useRemoveMetadata |
| `features/add-page-numbers/` | 신규: AddPageNumbersPage, PagePositionPicker, useAddPageNumbers |
| `features/odd-even/` | 신규: OddEvenPage, useOddEven |
| `components/MetadataPanel.tsx` | 신규 공통 컴포넌트: Info/RM 공유 |
| `lib/pdf/info.ts` | 신규: `getPdfInfo()` |
| `lib/pdf/metadata.ts` | 신규: `removeMetadata()` |
| `lib/pdf/pageNumbers.ts` | 신규: `addPageNumbers()` |
| `lib/pdf/oddEven.ts` | 신규: `extractOddOrEvenPages()` |

---

## 4. 주요 컴포넌트 구조

### 4.1 App.tsx — 최상위 레이아웃

```typescript
type Tab =
  | 'merge' | 'split' | 'extract' | 'delete'
  | 'rotate' | 'reorder' | 'encrypt' | 'image-to-pdf'
  | 'info' | 'remove-metadata' | 'add-page-numbers' | 'odd-even'

const tabs: { id: Tab; label: string }[] = [
  { id: 'merge',            label: '병합 (Merge)'           },
  { id: 'split',            label: '분할 (Split)'           },
  { id: 'extract',          label: '추출 (Extract)'         },
  { id: 'delete',           label: '삭제 (Delete)'          },
  { id: 'rotate',           label: '회전 (Rotate)'          },
  { id: 'reorder',          label: '순서 바꾸기 (Reorder)'  },
  { id: 'encrypt',          label: '암호화 (Protect)'       },
  { id: 'image-to-pdf',     label: '이미지→PDF'              },
  { id: 'info',             label: '문서 정보 (Info)'        },
  { id: 'remove-metadata',  label: '메타데이터 제거'          },
  { id: 'add-page-numbers', label: '페이지 번호 추가'         },
  { id: 'odd-even',         label: '홀수/짝수 선택'           },
]
```

```
App
├── 헤더 (제품명 + 프라이버시 뱃지)
├── 탭 바 (overflow-x-auto scrollbar-hide — 12개 탭)
│   ├── MergePage
│   ├── SplitPage
│   ├── ExtractPage
│   ├── DeletePage
│   ├── RotatePage
│   ├── ReorderPage
│   ├── PasswordProtectPage
│   ├── ImageToPdfPage
│   ├── InfoPage           (신규 — v1.7)
│   ├── RemoveMetadataPage (신규 — v1.7)
│   ├── AddPageNumbersPage (신규 — v1.7)
│   └── OddEvenPage        (신규 — v1.7)
└── 푸터
```

- 탭 바 클래스: `flex border-b border-gray-200 overflow-x-auto scrollbar-hide`
- 탭 전환 시 각 기능 컴포넌트 언마운트 → 상태 자동 초기화.

### 4.2~4.13 기존 기능 페이지 (변경 없음)

MergePage, SplitPage, ExtractPage, DeletePage, RotatePage, ReorderPage, PasswordProtectPage, ImageToPdfPage — v1.6 내용 그대로 유지.

### 4.14 InfoPage.tsx (신규 — v1.7)

```
InfoPage
├── [file === null] FileDropZone (single, accept=".pdf")
├── [file !== null] 파일 카드 (파일명 + X 버튼)
├── [status === 'loading'] 로딩 인디케이터 (Loader2 animate-spin)
│   "파일 분석 중이에요..."
├── [status === 'done', isEncrypted] amber 배너
│   "이 파일은 비밀번호로 잠겨 있어요."
│   "파일 속성은 표시되지만 메타데이터는 접근이 제한되어 있어요."
├── [status === 'done'] MetadataPanel (showFileInfo=true, info=pdfInfo)
├── [status === 'done'] "정보 복사" 버튼 (Copy 아이콘, variant="outline")
│   → navigator.clipboard.writeText() 호출
│   → 성공: 버튼 텍스트 "복사됨!" (2초 후 복원)
│   → 미지원: 버튼 disabled + title tooltip
└── [status === 'error'] 에러 카드 (role="alert")
```

- 다운로드 버튼 없음 — Info는 읽기 전용 기능.
- "새 작업 시작" 없음 — 파일 카드의 X 버튼으로 초기화.
- 파일 업로드 즉시 `getPdfInfo()` 호출 → 수십 ms 내 완료 (큰 파일에서만 loading 표시).

### 4.15 RemoveMetadataPage.tsx (신규 — v1.7)

```
RemoveMetadataPage
├── [file === null] FileDropZone
├── [file !== null, isEncrypted] 에러 파일 카드 (red)
│   "암호화된 파일은 메타데이터 제거를 지원하지 않아요."
│   "잠금 해제 탭에서 먼저 잠금을 해제해주세요."  (role="alert")
├── [file !== null, !isEncrypted] 정상 파일 카드
├── [file !== null, !isEncrypted] MetadataPanel (showFileInfo=false, info=pdfInfo)
│   → 메타데이터 없는 PDF: 패널 내 모든 값 "-" + "메타데이터가 없는 파일이에요." 힌트
├── OutputNameInput (기본값: "{원본파일명}_cleaned")
├── Button "메타데이터 제거하기" (canExecute 기반 활성/비활성)
├── [status === 'processing'] 버튼 내 스피너 + "제거 중..."
├── [status === 'done'] 완료 카드
│   CheckCircle "메타데이터 제거 완료!" + 자동 다운로드 안내
│   [다시 다운로드] [새 작업 시작]
└── [status === 'error'] 에러 카드 (role="alert")
    [다시 시도]
```

### 4.16 AddPageNumbersPage.tsx (신규 — v1.7)

```
AddPageNumbersPage
├── [file === null] FileDropZone
├── [file !== null] 파일 카드
├── [isEncrypted] 에러 배너 (암호화 파일 처리 불가)
├── ── 번호 설정 ──
│   ├── PagePositionPicker (value=position, onChange=setPosition)
│   └── 시작 번호 입력
│       <input type="number" min="1" />
│       힌트: "첫 페이지 번호: {startNumber}, 마지막 페이지 번호: {startNumber + pageCount - 1}"
│       에러: 0/음수 → "1 이상의 숫자를 입력해주세요." (인라인)
├── OutputNameInput (기본값: "{원본파일명}_numbered")
├── Button "페이지 번호 추가하기"
├── [status === 'done'] 완료 카드
└── [status === 'error'] 에러 카드
```

### 4.17 PagePositionPicker.tsx (신규 — v1.7)

RotateDegreeSelector / SplitModeSelector 패턴 기반. 6개 위치를 3×2 격자 버튼으로 표현.

```typescript
interface PagePositionPickerProps {
  value: PageNumberPosition    // 'bottom-center' | 'bottom-left' | 'bottom-right' | ...
  onChange: (value: PageNumberPosition) => void
  disabled?: boolean
}
```

```
<fieldset>
  <legend>번호 위치</legend>
  <div className="grid grid-cols-3 gap-2">
    [상단 좌]  [상단 중앙]  [상단 우]
    [하단 좌]  [하단 중앙●] [하단 우]
  </div>
</fieldset>
```

- 기본값: `'bottom-center'`
- 선택: `border-blue-500 bg-blue-50 text-blue-700`
- 미선택: `border-gray-200 bg-white text-gray-600 hover:bg-gray-50`
- 각 버튼: `px-3 py-2 text-xs rounded border`
- 접근성: `fieldset` + `legend` + 각 버튼 `aria-pressed` 또는 `role="radio"`

### 4.18 OddEvenPage.tsx (신규 — v1.7)

```
OddEvenPage
├── [file === null] FileDropZone
├── [file !== null] 파일 카드
├── [isEncrypted] 에러 배너
├── ── 추출 모드 ──
│   SplitModeSelector 패턴의 라디오 카드 2개
│   ├── (●) 홀수 페이지만
│   │       힌트: "1, 3, 5 ... 페이지 → {oddCount}페이지 추출"
│   └── (○) 짝수 페이지만
│           힌트: "2, 4, 6 ... 페이지 → {evenCount}페이지 추출"
├── [mode === 'even' && evenCount === 0] amber 배너 (role="status")
│   AlertTriangle "짝수 페이지가 없어요."
├── OutputNameInput (자동 갱신: mode=null→"", odd→"_odd", even→"_even")
├── Button "추출하기" (canExecute 기반)
├── [status === 'done'] 완료 카드
└── [status === 'error'] 에러 카드
```

### 4.19 MetadataPanel.tsx 공통 컴포넌트 (신규 — v1.7)

Info 탭과 Remove Metadata 탭에서 동일한 메타데이터 표시 레이아웃 공유.

```typescript
interface MetadataPanelProps {
  info: PdfInfo
  showFileInfo?: boolean   // true: 파일명/크기/페이지수/버전/암호화 행 포함 (Info 탭)
                           // false: 메타데이터만 표시 (Remove Metadata 탭)
  compact?: boolean        // RM 탭: 간략 표시
}
```

레이아웃:
```
<div className="bg-gray-50 border border-gray-200 rounded-md">
  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-4 py-3">
    {showFileInfo && (
      <>
        <dt>파일명</dt>   <dd>{info.fileName}</dd>
        <dt>파일 크기</dt> <dd>{formatFileSize(info.fileSize)}</dd>
        <dt>페이지 수</dt> <dd>{info.pageCount ?? '-'}</dd>
        <dt>PDF 버전</dt>  <dd>{info.pdfVersion}</dd>
        <dt>암호화</dt>    <dd>{info.isEncrypted ? '잠금됨' : '잠금 해제됨'}</dd>
        <Separator />
      </>
    )}
    <dt>제목</dt>      <dd>{info.title ?? '-'}</dd>
    <dt>작성자</dt>    <dd>{info.author ?? '-'}</dd>
    <dt>생성 도구</dt> <dd>{info.creator ?? '-'}</dd>
    <dt>PDF 변환기</dt><dd>{info.producer ?? '-'}</dd>
    <dt>생성일</dt>    <dd>{info.creationDate ? formatDate(info.creationDate) : '-'}</dd>
    <dt>수정일</dt>    <dd>{info.modificationDate ? formatDate(info.modificationDate) : '-'}</dd>
    <dt>키워드</dt>    <dd>{info.keywords ?? '-'}</dd>
  </dl>
</div>
```

- 빈 값: `<dd className="text-sm text-gray-400 italic">-</dd>`
- 500자 초과 메타데이터: `truncate` + "전체 보기" 토글 버튼
- 스크린 리더: `dl/dt/dd` 구조로 레이블-값 쌍 명확히 전달

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

/** v1.7 확장 — 12개 탭 (Unlock MVP 제외) */
export type ActiveTab =
  | 'merge' | 'split' | 'extract' | 'delete'
  | 'rotate' | 'reorder' | 'encrypt' | 'image-to-pdf'
  | 'info' | 'remove-metadata' | 'add-page-numbers' | 'odd-even'

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

/** v1.6 — Image to PDF 기능용 */
export type PageSizeMode = 'a4' | 'letter' | 'original'

export interface ImageItem {
  id: string              // nanoid() 등으로 생성, dnd-kit 식별자
  file: File
  previewUrl: string      // URL.createObjectURL(file), 에러 시 ''
  error?: string          // 미지원/손상/크기 초과 에러 메시지
  sizeWarning?: string    // 20MB~50MB 경고 메시지
  isGif?: boolean         // GIF 애니메이션 안내 표시용
}

/** v1.7 신규 — Info 기능용 */
export interface PdfInfo {
  fileName: string
  fileSize: number
  pdfVersion: string
  pageCount: number | null   // 암호화 시 null
  title?: string
  author?: string
  subject?: string
  keywords?: string
  creator?: string
  producer?: string
  creationDate?: Date
  modificationDate?: Date
  isEncrypted: boolean
}

/** v1.7 신규 — Add Page Numbers 기능용 */
export type PageNumberPosition =
  | 'bottom-center' | 'bottom-left' | 'bottom-right'
  | 'top-center'    | 'top-left'    | 'top-right'

export interface PageNumberOptions {
  position: PageNumberPosition
  fontSize: number
  startNumber: number
  format: 'number'   // MVP: 숫자 형식만. 'page-n-of-m'은 차기 릴리즈
}

/** v1.7 신규 — Odd/Even 기능용 */
export type OddEvenMode = 'odd' | 'even'
```

---

## 6. 상태 관리 전략

### 원칙

- 전역 상태 라이브러리를 사용하지 않는다.
- 각 기능은 독립적인 상태를 가진다. 탭 전환 시 자동 초기화.
- 복잡한 상태 로직은 커스텀 훅으로 캡슐화한다.

### useMerge / useSplit / useExtract / useDelete / useRotate / useReorder / usePasswordProtect / useImageToPdf

v1.6 내용 그대로 유지.

### useInfo 훅 (신규 — v1.7)

```typescript
interface UseInfoReturn {
  file: File | null
  pdfInfo: PdfInfo | null
  status: 'idle' | 'loading' | 'done' | 'error'
  error: string | null
  copyStatus: 'idle' | 'copied'  // 클립보드 복사 상태

  handleFileSelect: (file: File) => void
  handleRemoveFile: () => void
  handleCopy: () => Promise<void>
}
```

**특이사항:**
- 파일 업로드 즉시 `getPdfInfo(file)` 호출 — 별도 실행 버튼 없음.
- `canExecute` 패턴 없음 — Info는 수동 실행 없음.
- 다운로드 없음 — `downloadPDF()` 호출 없음.
- `copyStatus`: "정보 복사" → "복사됨!" 2초 표시 후 복원.

**상태 흐름:**
```
파일 업로드
  ↓ status = 'loading'
lib/pdf/info.getPdfInfo(file)
  ↓ status = 'done' | 'error'
MetadataPanel 렌더
```

### useRemoveMetadata 훅 (신규 — v1.7)

```typescript
interface UseRemoveMetadataReturn {
  file: File | null
  pdfInfo: PdfInfo | null     // 업로드 즉시 파싱 (미리보기용)
  isEncrypted: boolean
  outputName: string
  status: ProcessingStatus
  error: string | null
  resultBlob: Blob | null

  handleFileSelect: (file: File) => void
  handleRemoveFile: () => void
  setOutputName: (name: string) => void
  handleRemove: () => Promise<void>
  handleRetryDownload: () => void
  reset: () => void

  canExecute: boolean
  // file !== null && !isEncrypted && outputName.trim().length > 0 && status === 'idle'
}
```

**출력 파일명 기본값:** `{원본파일명}_cleaned` (확장자 제외)

### useAddPageNumbers 훅 (신규 — v1.7)

```typescript
interface UseAddPageNumbersReturn {
  file: File | null
  pageCount: number | null
  isEncrypted: boolean

  position: PageNumberPosition  // 기본값: 'bottom-center'
  startNumber: number           // 기본값: 1
  startNumberError: string | null  // 0/음수 입력 에러

  outputName: string
  status: ProcessingStatus
  error: string | null
  resultBlob: Blob | null

  handleFileSelect: (file: File) => void
  handleRemoveFile: () => void
  setPosition: (pos: PageNumberPosition) => void
  setStartNumber: (n: number) => void
  setOutputName: (name: string) => void
  handleAdd: () => Promise<void>
  handleRetryDownload: () => void
  reset: () => void

  canExecute: boolean
  // file !== null && !isEncrypted && startNumber >= 1
  // && !startNumberError && outputName.trim().length > 0 && status === 'idle'
}
```

**출력 파일명 기본값:** `{원본파일명}_numbered`

### useOddEven 훅 (신규 — v1.7)

```typescript
interface UseOddEvenReturn {
  file: File | null
  pageCount: number | null
  isEncrypted: boolean

  mode: OddEvenMode | null    // 초기값 null — 모드 미선택 시 버튼 비활성
  oddCount: number            // Math.ceil(pageCount / 2)
  evenCount: number           // Math.floor(pageCount / 2)
  noPages: boolean            // 선택한 모드에 해당 페이지 없음

  outputName: string          // 자동 갱신: null→"", odd→"{base}_odd", even→"{base}_even"
  outputNameDirty: boolean    // 사용자 직접 수정 여부 — true면 자동 갱신 중단

  status: ProcessingStatus
  error: string | null
  resultBlob: Blob | null

  handleFileSelect: (file: File) => void
  handleRemoveFile: () => void
  handleModeChange: (mode: OddEvenMode) => void
  setOutputName: (name: string) => void
  handleExtract: () => Promise<void>
  handleRetryDownload: () => void
  reset: () => void

  canExecute: boolean
  // file !== null && !isEncrypted && mode !== null
  // && !noPages && outputName.trim().length > 0 && status === 'idle'
}
```

**모드 전환 시 파일명 자동 갱신:**
```typescript
function handleModeChange(mode: OddEvenMode) {
  setMode(mode)
  if (!outputNameDirty) {
    const base = file!.name.replace(/\.pdf$/i, '')
    setOutputName(mode === 'odd' ? `${base}_odd` : `${base}_even`)
  }
}
```

### 상태 흐름 (Remove Metadata / Add Page Numbers / Odd/Even 공통)

```
파일 업로드
  ↓ 파일 카드 표시, 설정 입력 활성
실행 버튼 클릭
  ↓ status = 'processing', 입력 비활성
lib/pdf/*.ts 함수 호출
  ↓ status = 'done' or 'error'
완료: downloadPDF() 자동 호출 + 완료 카드
에러: 에러 카드 (role="alert")
```

---

## 7. PDF 처리 유틸 구조

### 7.1~7.10 기존 유틸 (변경 없음)

`merge.ts`, `split.ts`, `rotate.ts`, `reorder.ts`, `protect.ts`, `imageToPdf.ts`, `validate.ts`, `validateImage.ts`, `pageRange.ts`, `download.ts` — v1.6 내용 그대로 유지.

### 7.11 src/lib/pdf/info.ts (신규 — v1.7)

```typescript
import { PDFDocument } from 'pdf-lib'
import type { PdfInfo } from '@/types/pdf'

/**
 * PDF 파일에서 문서 정보 및 메타데이터를 읽어 PdfInfo 반환.
 * 암호화된 파일: isEncrypted=true, pageCount=null, 메타데이터 필드 모두 undefined.
 * 손상된 파일: 에러 throw.
 */
export async function getPdfInfo(file: File): Promise<PdfInfo>

/**
 * ArrayBuffer 헤더에서 PDF 버전 직접 파싱.
 * "%PDF-1.7" → "1.7", "%PDF-2.0" → "2.0"
 * 파싱 실패 시 'unknown' 반환.
 */
function readPdfVersion(buffer: ArrayBuffer): string
```

**구현 주의사항:**
- `PDFDocument.load(arrayBuffer)` 실패 시 암호화 여부 먼저 확인 (`isEncryptedPDF()` 재사용).
- 암호화 파일은 `ignoreEncryption: true`로 로드하지 않음 — 콘텐츠 손상 위험.
- 암호화 파일은 `isEncrypted: true`, 메타데이터 필드 undefined, `pageCount: null` 반환.
- `pdfDoc.getTitle()` 등 반환값 빈 문자열 → undefined로 정규화.

### 7.12 src/lib/pdf/metadata.ts (신규 — v1.7)

```typescript
import { PDFDocument } from 'pdf-lib'

/**
 * PDF 메타데이터를 제거한 새 PDF 반환.
 * PDFDocument.create() + copyPages() 패턴으로 XMP stream 미복사.
 * 이후 setTitle(''), setAuthor('') 등으로 표준 메타데이터 빈값 설정.
 * 암호화된 파일 전달 시 에러 throw (훅에서 사전 차단).
 */
export async function removeMetadata(file: File): Promise<Uint8Array>
```

**구현 패턴:**
```typescript
const srcDoc = await PDFDocument.load(await file.arrayBuffer())
const newDoc = await PDFDocument.create()
const pages = await newDoc.copyPages(srcDoc, srcDoc.getPageIndices())
pages.forEach(p => newDoc.addPage(p))
// XMP stream은 copyPages()에서 복사되지 않음 — 별도 처리 불필요
newDoc.setTitle('')
newDoc.setAuthor('')
newDoc.setSubject('')
newDoc.setKeywords([])
newDoc.setCreator('')
newDoc.setProducer('')
// CreationDate/ModDate: pdf-lib setCreationDate() API 없음 → PDFName 직접 제거
return newDoc.save()
```

### 7.13 src/lib/pdf/pageNumbers.ts (신규 — v1.7)

```typescript
import { PDFDocument, StandardFonts } from 'pdf-lib'
import type { PageNumberOptions } from '@/types/pdf'

/**
 * PDF 각 페이지에 번호 텍스트를 삽입한 새 PDF 반환.
 * 페이지 회전(90°/270°) 보정: width/height swap 처리.
 * 암호화된 파일 전달 시 에러 throw.
 */
export async function addPageNumbers(
  file: File,
  options: PageNumberOptions
): Promise<Uint8Array>
```

**구현 주의사항:**
```typescript
// 회전 보정: 90°/270° 회전 페이지는 실제 렌더링 width/height가 바뀜
const rotation = page.getRotation().angle
const { width: rawW, height: rawH } = page.getSize()
const [pageW, pageH] = (rotation === 90 || rotation === 270)
  ? [rawH, rawW]
  : [rawW, rawH]

// 중앙 정렬: x = (pageW - textWidth) / 2
const textWidth = font.widthOfTextAtSize(text, options.fontSize)

// 위치별 y 좌표 (pdf-lib 좌하단 원점)
const MARGIN = 20
const y = position.startsWith('bottom') ? MARGIN : pageH - MARGIN - options.fontSize

// drawText 호출 시 회전된 페이지의 transform 고려
page.drawText(text, { x, y, size: options.fontSize, font })
```

### 7.14 src/lib/pdf/oddEven.ts (신규 — v1.7)

```typescript
import { extractPages } from './split'
import type { OddEvenMode } from '@/types/pdf'

/**
 * 홀수 또는 짝수 페이지만 추출한 새 PDF 반환.
 * extractPages() 완전 재사용.
 * 선택한 모드에 해당 페이지 없으면 에러 throw (훅에서 사전 차단).
 */
export async function extractOddOrEvenPages(
  file: File,
  mode: OddEvenMode
): Promise<Uint8Array>
```

**구현:**
```typescript
export async function extractOddOrEvenPages(file: File, mode: OddEvenMode) {
  const pageCount = await getPdfPageCount(file)
  const indices = Array.from({ length: pageCount }, (_, i) => i)
    .filter(i => mode === 'odd' ? i % 2 === 0 : i % 2 === 1)  // 0-based: 홀수페이지=짝수인덱스
  return extractPages(file, indices)
}
```

---

## 8. @dnd-kit 활용 방안

### 8.1 Merge의 FileList (기존)
### 8.2 Reorder의 PageCardList (기존)
### 8.3 Image to PDF의 ImageCardList (신규 — v1.6)

v1.6 내용 그대로 유지. 신규 4개 기능은 드래그앤드롭 불필요.

---

## 9. 에러 처리 전략

### 에러 발생 레이어별 처리

| 레이어 | 에러 유형 | 처리 방식 |
|--------|----------|----------|
| FileDropZone | PDF 아닌 파일 | 즉시 거부 |
| useInfo | 암호화된 파일 업로드 | amber 배너 + 기본 정보만 표시 (에러 아님) |
| useInfo | 손상된 파일 | `status='error'`, 에러 카드 |
| useRemoveMetadata | 암호화된 파일 | 파일 카드 내 에러 (red), canExecute=false |
| useAddPageNumbers | 암호화된 파일 | 에러 배너, canExecute=false |
| useAddPageNumbers | 시작 번호 0/음수 | `startNumberError` → 인라인 에러, canExecute=false |
| useOddEven | 암호화된 파일 | 에러 배너, canExecute=false |
| useOddEven | 짝수 없음 (1페이지 + even 선택) | amber 배너, `noPages=true`, canExecute=false |
| useOddEven | 모드 미선택 | `mode=null`, canExecute=false |
| handleRemove / handleAdd / handleExtract | pdf-lib 처리 실패 | `status='error'`, 에러 카드 (role="alert") |
| PageRangeInput | 형식/범위 오류 | 실시간 인라인 오류 (기존 기능) |
| useDelete | 삭제 후 0페이지 | `deleteAllWarning` 경고 배너 |
| usePasswordProtect | 이미 암호화된 파일 | `fileError` → 파일 카드 내 에러 표시 |
| 이미지 추가 | 미지원 형식 | `error` 설정 → 에러 카드 |

### v1.7 신규 에러 패턴

- **Info 암호화 파일**: 에러 카드 대신 amber 안내 배너. `role="status"` (에러 아님).
- **RM 암호화 파일**: red 파일 카드 + 잠금 해제 탭 안내 텍스트. 처리 버튼 비활성.
- **OddEven 짝수 없음**: amber 배너 + 버튼 비활성. "에러"가 아닌 조건 안내.
- **"다시 시도" 공통 패턴**: `status → idle`, 파일/설정 유지. 파일 재업로드 불필요.

---

## 10. 성능 고려사항

### 번들 크기

| 항목 | 예상 크기(gzip) | 비고 |
|------|----------------|------|
| React + ReactDOM | ~45KB | |
| pdf-lib | ~250KB | 신규 4개 기능도 동일 라이브러리 |
| pdf-lib-plus-encrypt | ~260KB | Password Protect 전용 |
| JSZip | ~25KB | |
| @dnd-kit | ~20KB | 기존 3곳 공유, 신규 기능 추가 없음 |
| Tailwind CSS(purged) | ~10KB | |
| shadcn/ui 컴포넌트 | ~10KB | |
| 앱 코드 | ~75KB | 신규 4개 기능으로 ~10KB 증가 예상 |
| **합계** | **~695KB** | 목표 2MB(~700KB gzip) 이내 |

신규 4개 기능 모두 추가 라이브러리 없음 — 번들 크기 증가 최소.

### Info 탭 성능

- `getPdfInfo()` 는 동기적 메타데이터 읽기 — 수십 ms 내 완료.
- 큰 파일(100MB+)에서 `arrayBuffer()` 로딩 시간이 지배적. `status='loading'` 표시 필요.

### Add Page Numbers 성능

- `addPageNumbers()` 는 전체 페이지 순회 + `drawText()` — 페이지 수 비례.
- 100페이지: 약 1~2초. `status='processing'` 필수.

### Remove Metadata 성능

- `PDFDocument.create()` + `copyPages()` — 페이지 수 비례 메모리.
- 기존 Reorder와 동일 패턴, 실측 기준 허용 범위.

---

## 11. 향후 확장 시 분리 가능한 포인트

### Web Worker 분리
`src/lib/pdf/*.ts` 순수 함수들은 UI 의존성이 없다. `Comlink`로 래핑하여 Web Worker로 이동 가능.
`addPageNumbers()`와 `removeMetadata()`가 무거운 경우 우선 대상.

### Unlock 기능 추가 (차기 릴리즈)
- qpdf WASM 빌드 환경 확보 후 `features/unlock/` + `lib/pdf/unlock.ts` 추가.
- `ActiveTab`에 `'unlock'` 추가, `App.tsx` 탭 배열 1개 추가.
- 기존 코드 변경 최소화.

### Add Page Numbers — 번호 형식 확장
- `PageNumberOptions.format` 현재 `'number'`만 지원.
- 차기 릴리즈: `'page-n-of-m'` 추가 시 `pageNumbers.ts` 내부만 변경.

### MetadataPanel 확장
현재 Info/RM 공유. `showFileInfo` / `compact` prop으로 표시 범위 제어.
향후 Unlock 완료 후 메타데이터 미리보기 필요 시 재사용 가능.

### PasswordInput 컴포넌트 공용화
현재 `features/encrypt/` 내부. Unlock 기능 추가 시 `components/`로 이동 고려.

---

## 12. 기능별 재활용 매핑

| 재활용 대상 | Merge | Split | Extract | Delete | Rotate | Reorder | Encrypt | Img→PDF | Info | Rm-Meta | Add-PN | OddEven |
|-----------|:-----:|:-----:|:-------:|:------:|:------:|:-------:|:-------:|:-------:|:----:|:-------:|:------:|:-------:|
| `FileDropZone` | O | O | O | O | O | O | O | O | O | O | O | O |
| `PageRangeInput` | - | O | O | O | O | - | - | - | - | - | - | - |
| `OutputNameInput` | O | - | - | - | O | O | O | O | - | O | O | O |
| `LoadingOverlay` | O | O | O | O | O | O | O | O | - | O | O | O |
| `ErrorMessage` | O | O | O | O | O | O | - | - | - | - | - | - |
| `PasswordInput` | - | - | - | - | - | - | O | - | - | - | - | - |
| `MetadataPanel` | - | - | - | - | - | - | - | - | O | O | - | - |
| `FileList` (@dnd-kit) | O | - | - | - | - | - | - | - | - | - | - | - |
| `PageCardList` (@dnd-kit) | - | - | - | - | - | O | - | - | - | - | - | - |
| `ImageCardList` (@dnd-kit) | - | - | - | - | - | - | - | O | - | - | - | - |
| `RotateDegreeSelector` | - | - | - | - | O | - | - | - | - | - | - | - |
| `PageSizePicker` | - | - | - | - | - | - | - | O | - | - | - | - |
| `PagePositionPicker` | - | - | - | - | - | - | - | - | - | - | O | - |
| `mergePDFs()` | O | - | - | - | - | - | - | - | - | - | - | - |
| `getPdfPageCount()` | O | O | O | O | O | O | O | - | - | O | O | O |
| `extractPages()` | - | O | O | - | - | - | - | - | - | - | - | - |
| `splitAllPages()` | - | O | - | - | - | - | - | - | - | - | - | - |
| `splitByRanges()` | - | O | - | - | - | - | - | - | - | - | - | - |
| `deletePages()` | - | - | - | O | - | - | - | - | - | - | - | - |
| `rotatePages()` | - | - | - | - | O | - | - | - | - | - | - | - |
| `reorderPages()` | - | - | - | - | - | O | - | - | - | - | - | - |
| `protectPDF()` | - | - | - | - | - | - | O | - | - | - | - | - |
| `imagesToPdf()` | - | - | - | - | - | - | - | O | - | - | - | - |
| `getPdfInfo()` | - | - | - | - | - | - | - | - | O | O | - | - |
| `removeMetadata()` | - | - | - | - | - | - | - | - | - | O | - | - |
| `addPageNumbers()` | - | - | - | - | - | - | - | - | - | - | O | - |
| `extractOddOrEvenPages()` | - | - | - | - | - | - | - | - | - | - | - | O |
| `isEncryptedPDF()` | - | - | - | - | - | - | O | - | O | O | O | O |
| `validateFileType()` | O | O | O | O | O | O | O | - | O | O | O | O |
| `checkSingleFileSizePolicy()` | - | O | O | O | O | O | O | - | O | O | O | O |
| `parsePageRanges()` | - | O | O | O | O | - | - | - | - | - | - | - |
| `validateRangeInput()` | - | O | O | O | O | - | - | - | - | - | - | - |
| `validateImageFile()` | - | - | - | - | - | - | - | O | - | - | - | - |
| `checkImageSizePolicy()` | - | - | - | - | - | - | - | O | - | - | - | - |
| `checkTotalImageSizePolicy()` | - | - | - | - | - | - | - | O | - | - | - | - |
| `downloadPDF()` | O | O(단일) | O | O | O | O | O | O | - | O | O | O |
| `downloadZip()` | - | O(다수) | - | - | - | - | - | - | - | - | - | - |

---

*이 문서는 Frontend Implementation 엔지니어의 구현 기준 문서로 사용된다.*

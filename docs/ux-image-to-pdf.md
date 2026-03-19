# UX/UI 설계 - 이미지를 PDF로 변환 (Image to PDF) 화면

> 버전: 1.0
> 기준 문서: PRD v1.4, PDF_IMAGE_TO_PDF_SPEC.md
> 작성일: 2026-03-19
> 기존 Merge / Split / Extract / Delete / Rotate / Reorder / Password Protect UI 패턴과 일관성 유지

---

## 1. 정보 구조 (IA)

```
vibe-pdf
├── 병합 (Merge)              ← 기존
├── 분할 (Split)              ← 기존
├── 추출 (Extract)            ← 기존
├── 삭제 (Delete)             ← 기존
├── 회전 (Rotate)             ← 기존
├── 순서 바꾸기 (Reorder)     ← 기존
├── 암호화 (Protect)          ← 기존
└── 이미지→PDF (Image to PDF) ← 신규 (8번째 탭)
```

탭 바 `overflow-x-auto scrollbar-hide` 이미 적용 중 (ux-rotate-reorder.md Section 16 참고).

---

## 2. 기능 정의

### Image to PDF (이미지를 PDF로 변환)
- JPG, PNG, WebP, GIF, BMP 이미지 1개 이상 업로드
- 각 이미지가 PDF 1페이지가 되는 단일 PDF 생성
- 이미지 카드 목록: 파일명 + 썸네일 표시, 드래그앤드롭 순서 변경, 개별 제거
- 페이지 크기 선택: A4 (기본), Letter, 이미지 원본 크기
- A4/Letter 모드: 이미지를 비율 유지하며 중앙 fit 배치 (여백 40pt)
- 출력 파일명 기본값: 이미지 1장 → `{원본명}.pdf`, 복수 → `images.pdf`
- 모든 처리는 브라우저 로컬에서만 수행 (서버 전송 없음)

### 지원/미지원 포맷
| 포맷 | 지원 여부 | 처리 |
|------|---------|------|
| JPG, PNG | 직접 지원 | pdf-lib 직접 임베딩 |
| WebP, GIF, BMP | 변환 지원 | Canvas API → PNG 변환 후 임베딩 |
| GIF (애니메이션) | 첫 프레임만 | Canvas 렌더링 (첫 프레임) |
| HEIC, TIFF, SVG | 미지원 | 업로드 즉시 거부 |

### MVP 범위에서 제외
- EXIF orientation 자동 보정 (스마트폰 사진 회전 이슈 — 알려진 제약사항)
- 이미지 편집 (크롭, 필터, 보정)
- Letter 이외 특수 페이지 크기

---

## 3. 사용자 플로우

```
[탭: 이미지→PDF] → [이미지 파일 업로드] → [이미지 카드 목록 표시]
     → (선택) [카드 순서 드래그앤드롭] → (선택) [개별 이미지 제거]
     → [페이지 크기 선택: A4 / Letter / 원본 크기]
     → [출력 파일명 확인/수정] → [PDF 만들기 버튼 클릭]
     → [처리 중] → [완료: 자동 다운로드 + 완료 카드] 또는 [에러 카드]
```

### 분기 조건
| 조건 | 동작 |
|------|------|
| 지원하지 않는 형식 업로드 | 해당 파일만 거부 + 인라인 에러 (목록에 에러 카드) |
| 손상된 이미지 | 해당 파일만 거부 + 인라인 에러 |
| 개별 파일 크기 > 50MB | 해당 파일 업로드 거부 + 에러 |
| 개별 파일 크기 20~50MB | 업로드 허용 + 해당 카드에 경고 뱃지 |
| 합산 크기 > 200MB | 전체 변환 실행 거부 + 에러 배너 |
| 이미지 0개 | 버튼 비활성 |
| 처리 중 | 모든 입력 비활성 + 스피너 |

---

## 4. 화면 목록

| 화면 ID | 이름 | 설명 |
|---------|------|------|
| IP-S1 | 초기 상태 | 이미지 미업로드, FileDropZone 표시 |
| IP-S2 | 이미지 업로드 완료 | 이미지 카드 목록 + 페이지 크기 선택 + 실행 버튼 |
| IP-S3 | 순서 변경 중 | 드래그앤드롭 진행 중 (드래그 상태 시각화) |
| IP-S4 | 에러 이미지 포함 | 목록 내 일부 카드 에러 표시 |
| IP-S5 | 처리 중 | 변환 진행 스피너 |
| IP-S6 | 완료 | 완료 카드 + 다운로드 버튼 |
| IP-S7 | 에러 | 에러 카드 (변환 실패) |

---

## 5. 레이아웃 설명

### 5.0 탭 바 (App.tsx 수정)
```
[ 병합 | 분할 | 추출 | 삭제 | 회전 | 순서 바꾸기 | 암호화 (Protect) | 이미지→PDF ]
← overflow-x-auto scrollbar-hide →
```
- 탭 텍스트: `"이미지→PDF"`
- Tab ID: `'image-to-pdf'`
- `type Tab = 'merge' | 'split' | 'extract' | 'delete' | 'rotate' | 'reorder' | 'encrypt' | 'image-to-pdf'`

---

### 5.1 IP-S1: 초기 상태

```
┌─────────────────────────────────────────────────────┐
│  [탭 바 ... | 이미지→PDF*]                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  이미지를 PDF로 변환                                  │
│  이미지 파일을 업로드하면 PDF로 만들어 드려요.           │
│                                                     │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   │
│  │  이미지를 여기에 드래그하거나                   │   │
│  │  [파일 선택] 버튼을 클릭하세요.                │   │
│  │  JPG · PNG · WebP · GIF · BMP · 여러 파일 가능  │   │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘   │
│                                                     │
│  [Shield] 파일이 내 기기를 떠나지 않아요              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### 5.2 IP-S2: 이미지 업로드 완료

```
┌─────────────────────────────────────────────────────┐
│  [탭 바]                                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  이미지를 PDF로 변환                                  │
│                                                     │
│  ── 이미지 목록 (3개) ────────────────────────────── │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ [⠿] [썸네일 60×60] photo1.jpg     1.2 MB [X]│    │
│  └─────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │ [⠿] [썸네일 60×60] photo2.png     3.4 MB [X]│    │
│  └─────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │ [⠿] [썸네일 60×60] scan.webp      0.8 MB [X]│    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  [+ 이미지 추가]  ← 보조 버튼 (outline)              │
│                                                     │
│  ── 페이지 크기 ─────────────────────────────────── │
│                                                     │
│  (●) A4 (210 × 297mm)     ← 기본값                  │
│  (○) Letter (216 × 279mm)                           │
│  (○) 이미지 원본 크기                                │
│                                                     │
│  ── 출력 설정 ─────────────────────────────────────  │
│                                                     │
│  출력 파일명                                         │
│  ┌─────────────────────────┐                       │
│  │ images                  │ .pdf                  │
│  └─────────────────────────┘                       │
│                                                     │
│  [PDF 만들기]  ← 활성 (bg-blue-600)                  │
│                                                     │
│  [Lock] 파일이 서버로 전송되지 않아요                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### 5.3 IP-S3: 드래그앤드롭 순서 변경 중

```
│  ┌─────────────────────────────────────────────┐    │
│  │ [⠿] [썸네일] photo1.jpg              [X]    │    │  ← 정상 카드
│  └─────────────────────────────────────────────┘    │
│  ┌─────────── 드래그 중 (floating) ───────────┐     │
│  │ [⠿] [썸네일] photo2.png     (투명도 0.5)   │     │  ← 드래그 중 카드
│  └────────────────────────────────────────────┘     │
│  ┌────── 드롭 예정 위치 (drop indicator) ──────┐     │
│  │                   ──────                   │     │  ← 파란 구분선
│  └────────────────────────────────────────────┘     │
│  ┌─────────────────────────────────────────────┐    │
│  │ [⠿] [썸네일] scan.webp               [X]   │    │  ← 정상 카드
│  └─────────────────────────────────────────────┘    │
```

- 드래그 중 카드: `opacity-50 shadow-lg` (dnd-kit 기존 Reorder 패턴 동일)
- 드롭 위치 표시: `border-t-2 border-blue-500`
- GripVertical 핸들: `<GripVertical className="text-gray-400 cursor-grab" />`

---

### 5.4 IP-S4: 에러 이미지 카드

```
│  ┌─────────────────────────────────────────────┐    │
│  │ [⠿] [썸네일] photo1.jpg            [X]     │    │  ← 정상 카드
│  └─────────────────────────────────────────────┘    │
│  ┌─ bg-red-50 border-red-300 ──────────────────┐    │
│  │ [AlertCircle] broken.bmp                [X]  │    │  ← 에러 카드
│  │ 지원하지 않는 이미지 형식이에요. (BMP)          │    │
│  └─────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │ [⠿] [썸네일] scan.webp            [X]      │    │  ← 정상 카드
│  └─────────────────────────────────────────────┘    │
```

- 에러 카드는 드래그 핸들 미표시 (순서 변경 대상 아님)
- X 버튼으로 에러 카드 제거 가능
- 에러 이미지가 목록에 있는 동안 "PDF 만들기" 버튼 비활성
- `role="alert"` on 에러 메시지 p 태그

---

### 5.5 IP-S5: 처리 중

```
│  [이미지 카드 목록 - disabled opacity]          │
│  [페이지 크기 선택 - disabled]                 │
│  [출력 파일명 - disabled]                      │
│                                               │
│  [ [Loader2 animate-spin] 변환 중이에요... ]  ← 버튼 비활성 │
```

---

### 5.6 IP-S6: 완료 상태

```
│  ┌─ bg-green-50 border-green-200 ────────────┐  │
│  │  [CheckCircle text-green-600]              │  │
│  │  PDF 변환 완료!                             │  │
│  │  images.pdf (3페이지)                      │  │
│  │  파일이 자동으로 다운로드 되었어요.           │  │
│  │                                           │  │
│  │  [다시 다운로드]    [새 작업 시작]           │  │
│  └───────────────────────────────────────────┘  │
```

- `<CheckCircle className="text-green-600" />`
- "새 작업 시작": 상태 전체 초기화 → IP-S1 (썸네일 URL revoke 포함)
- "다시 다운로드": 동일 Blob URL로 재다운로드
- MergePage.tsx / PasswordProtectPage 완료 카드 패턴과 동일

---

### 5.7 IP-S7: 에러 상태

```
│  ┌─ bg-red-50 border-red-200 ─────────────────┐  │
│  │  [AlertCircle text-red-600]                 │  │
│  │  PDF 변환 중 오류가 발생했어요.               │  │
│  │  {에러 메시지}                               │  │
│  │                                             │  │
│  │  [다시 시도]                                  │  │
│  └─────────────────────────────────────────────┘  │
```

- `role="alert"`
- "다시 시도": 상태를 idle로 되돌림, 이미지 목록 유지

---

## 6. 컴포넌트 목록

| 컴포넌트 | 파일 위치 | 설명 | 신규/재사용 |
|---------|----------|------|------------|
| `ImageToPdfPage` | `src/features/image-to-pdf/ImageToPdfPage.tsx` | 메인 페이지 컴포넌트 | 신규 |
| `useImageToPdf` | `src/features/image-to-pdf/useImageToPdf.ts` | 상태 관리 훅 | 신규 |
| `ImageCardList` | `src/features/image-to-pdf/ImageCardList.tsx` | dnd-kit 기반 이미지 카드 목록 | 신규 |
| `ImageCard` | `src/features/image-to-pdf/ImageCard.tsx` | 개별 이미지 카드 (썸네일 + 파일명 + 드래그 핸들 + X) | 신규 |
| `PageSizePicker` | `src/features/image-to-pdf/PageSizePicker.tsx` | A4 / Letter / 원본 크기 라디오 선택 | 신규 |
| `FileDropZone` | `src/components/FileDropZone.tsx` | 이미지 드롭존 + "이미지 추가" 버튼 | 재사용 (multiple=true) |
| `OutputNameInput` | `src/components/OutputNameInput.tsx` | 출력 파일명 입력 | 재사용 |

---

## 7. 컴포넌트 상세 설계

### 7.1 ImageCard

```
Props:
  id: string
  file: File
  previewUrl: string           // URL.createObjectURL(file) 결과
  error?: string               // 에러 메시지 (손상/미지원)
  sizeWarning?: string         // 크기 경고 (20MB~50MB)
  onRemove: (id: string) => void
  disabled?: boolean
  // dnd-kit useSortable 훅은 ImageCard 내부에서 사용
```

레이아웃:
```
<div ref={setNodeRef} style={style}
     className="flex items-center gap-3 rounded-md border bg-white px-3 py-2.5">

  {/* 드래그 핸들 (에러 카드에서는 숨김) */}
  {!error && (
    <div {...attributes} {...listeners} className="cursor-grab">
      <GripVertical className="h-5 w-5 text-gray-400" />
    </div>
  )}

  {/* 썸네일 */}
  {previewUrl && !error ? (
    <img src={previewUrl} alt={file.name}
         className="h-14 w-14 rounded object-cover flex-shrink-0" />
  ) : (
    <div className="h-14 w-14 rounded bg-red-100 flex items-center justify-center">
      <AlertCircle className="text-red-400" />
    </div>
  )}

  {/* 파일 정보 */}
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium truncate">{file.name}</p>
    {!error && <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>}
    {sizeWarning && <p className="text-xs text-amber-600">{sizeWarning}</p>}
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>

  {/* X 버튼 */}
  <button onClick={() => onRemove(id)} aria-label={`${file.name} 제거`}>
    <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
  </button>
</div>
```

---

### 7.2 PageSizePicker

SplitModeSelector.tsx / RotateDegreeSelector.tsx 라디오 카드 패턴 재사용.

```
Props:
  value: 'a4' | 'letter' | 'original'
  onChange: (value: 'a4' | 'letter' | 'original') => void
  disabled?: boolean
```

레이아웃:
```
<fieldset>
  <legend className="text-sm font-medium text-gray-700 mb-2">페이지 크기</legend>
  <div className="flex flex-col gap-2">
    {options.map(opt => (
      <label key={opt.value}
             className={`flex items-center gap-3 rounded-md border px-4 py-3 cursor-pointer
               ${value === opt.value
                 ? 'border-blue-500 bg-blue-50'
                 : 'border-gray-200 bg-white hover:bg-gray-50'
               }`}>
        <input type="radio" name="pageSize" value={opt.value}
               checked={value === opt.value} onChange={() => onChange(opt.value)} />
        <span className="font-medium">{opt.label}</span>
        <span className="text-sm text-gray-500">{opt.description}</span>
      </label>
    ))}
  </div>
</fieldset>
```

옵션:
| value | label | description |
|-------|-------|-------------|
| `'a4'` | `A4` | `210 × 297mm · 인쇄에 적합 (기본값)` |
| `'letter'` | `Letter` | `216 × 279mm · 미국 표준` |
| `'original'` | `이미지 원본 크기` | `각 이미지의 픽셀 크기를 그대로 사용` |

---

### 7.3 useImageToPdf 훅 상태

```typescript
interface ImageItem {
  id: string;             // nanoid() 등으로 생성
  file: File;
  previewUrl: string;     // URL.createObjectURL(file)
  error?: string;         // 미지원/손상/크기 초과 에러
  sizeWarning?: string;   // 20MB~50MB 경고
}

interface ImageToPdfState {
  // 이미지 목록
  images: ImageItem[];

  // 설정
  pageSize: 'a4' | 'letter' | 'original';
  outputName: string;       // 기본값: 1장이면 파일명, 복수면 'images'

  // 처리 상태
  status: 'idle' | 'processing' | 'done' | 'error';
  errorMessage: string | null;
  resultBlob: Blob | null;
  resultPageCount: number | null;
}
```

### 버튼 활성화 조건
```typescript
const hasValidImages = images.some(img => !img.error);
const hasErrorImages = images.some(img => !!img.error);

const canConvert =
  hasValidImages &&
  !hasErrorImages &&              // 에러 카드가 있으면 비활성
  outputName.trim().length > 0 &&
  status === 'idle';
```

### 이미지 추가 처리
```typescript
function handleAddImages(files: File[]) {
  for (const file of files) {
    const item: ImageItem = { id: nanoid(), file, previewUrl: '' };

    // 1. MIME/확장자 검사
    if (!isSupportedImageFormat(file)) {
      item.error = `지원하지 않는 이미지 형식이에요. (${getExtension(file)})`;
      item.previewUrl = '';  // 썸네일 없음
    }
    // 2. 개별 크기 정책 (50MB 초과 → 거부)
    else if (file.size > MAX_IMAGE_SIZE) {
      item.error = `파일 크기가 너무 커요. 50MB 이하 파일을 선택해 주세요.`;
      item.previewUrl = '';
    }
    // 3. 크기 경고 (20MB~50MB)
    else {
      item.previewUrl = URL.createObjectURL(file);
      if (file.size > WARN_IMAGE_SIZE) {
        item.sizeWarning = `파일이 커서 처리 시간이 걸릴 수 있어요.`;
      }
    }

    addImage(item);
  }

  // 출력 파일명 자동 갱신
  updateOutputName();
}
```

### 이미지 제거 시 URL 해제
```typescript
function handleRemove(id: string) {
  const item = images.find(img => img.id === id);
  if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
  removeImage(id);
  updateOutputName();
}
```

### 출력 파일명 자동 갱신 규칙
```typescript
function updateOutputName() {
  const validImages = images.filter(img => !img.error);
  if (validImages.length === 1) {
    const name = validImages[0].file.name.replace(/\.[^.]+$/, '');
    setOutputName(name);
  } else {
    setOutputName('images');
  }
}
```

---

## 8. 상태별 UX 요약

| 상태 | FileDropZone/목록 | PageSizePicker | 버튼 상태 | 특이사항 |
|------|-----------------|---------------|---------|---------|
| IP-S1: 초기 | FileDropZone 표시 | 숨김 | 없음 | - |
| IP-S2: 이미지 업로드 완료 | 이미지 카드 목록 | 표시 | 활성 | "이미지 추가" 버튼 유지 |
| IP-S3: 드래그 중 | 드래그 상태 시각화 | - | 활성 | 드래그 카드 투명도 + 드롭 인디케이터 |
| IP-S4: 에러 카드 포함 | 에러 카드 혼재 | 표시 | 비활성 | 에러 카드 제거 시 활성 복귀 |
| IP-S5: 처리 중 | 전체 비활성 | 비활성 | 비활성+스피너 | - |
| IP-S6: 완료 | 숨김 | 숨김 | 없음 | 완료 카드 |
| IP-S7: 에러 | 이미지 목록 유지 | 유지 | idle 복귀 | 에러 카드 |

---

## 9. 이미지 카드 목록 UX

### 썸네일
- 크기: `h-14 w-14` (56px × 56px)
- 표시: `object-cover rounded` (비율 유지 크롭)
- 에러 카드: 빨간 배경 + AlertCircle 아이콘 (썸네일 없음)
- 생성: `URL.createObjectURL(file)` (동기 즉시 표시)
- 해제: 제거 시 + "새 작업 시작" 시 `URL.revokeObjectURL()` 호출

### 드래그앤드롭 (dnd-kit)
- Reorder 기능의 기존 패턴 동일하게 적용
- `DndContext` + `SortableContext` + `useSortable` per card
- 드래그 핸들: `GripVertical` 아이콘 (에러 카드는 핸들 없음)
- 에러 카드는 `useSortable` 비활성 (`disabled={true}`)

### "이미지 추가" 보조 버튼
- 위치: 이미지 카드 목록 하단
- 스타일: `border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-50`
- 클릭: input[type="file"] trigger (기존 FileDropZone 패턴 활용)
- 효과: 기존 목록에 새 이미지 추가 (초기화 아님)

---

## 10. 페이지 크기 선택 UX

- 기본값: A4
- A4: 595.28 × 841.89 pt, 여백 40pt, 비율 유지 중앙 fit (확대 없음)
- Letter: 612 × 792 pt, 동일 여백/fit 로직
- 원본 크기: 각 이미지 픽셀 크기 = 페이지 크기, 페이지마다 크기 다를 수 있음
- "원본 크기" 선택 시 힌트 텍스트: `이미지마다 페이지 크기가 다를 수 있어요.`

---

## 11. 마이크로카피

### 페이지 제목 / 설명
- 제목: `이미지를 PDF로 변환`
- 부제: `이미지 파일을 업로드하면 PDF로 만들어 드려요.`

### 파일 드롭존
- 제목: `이미지를 여기에 드래그하거나`
- 버튼: `파일 선택`
- 힌트: `JPG · PNG · WebP · GIF · BMP · 여러 파일 가능`

### 이미지 카드
| 항목 | 텍스트 |
|------|--------|
| 제거 버튼 aria-label | `{파일명} 제거` |
| 드래그 핸들 aria-label | `{파일명} 순서 변경` |
| 크기 경고 (20~50MB) | `파일이 커서 처리 시간이 걸릴 수 있어요.` |

### 에러 메시지 (카드 내)
| 상황 | 메시지 |
|------|--------|
| 미지원 형식 | `지원하지 않는 이미지 형식이에요. (JPG, PNG, WebP, GIF, BMP만 가능)` |
| 손상된 파일 | `이미지를 읽을 수 없어요. 파일이 손상되었을 수 있어요.` |
| 개별 크기 초과 (50MB) | `파일 크기가 너무 커요. 50MB 이하 파일을 선택해 주세요.` |

### 처리 상태
| 상태 | 버튼 텍스트 |
|------|-----------|
| idle (활성) | `PDF 만들기` |
| idle (비활성) | `PDF 만들기` (gray) |
| processing | `변환 중이에요...` (스피너) |

### 완료 상태
- 제목: `PDF 변환 완료!`
- 설명: `파일이 자동으로 다운로드 되었어요.`
- 버튼 1: `다시 다운로드`
- 버튼 2: `새 작업 시작`

### 에러 상태
- 제목: `PDF 변환 중 오류가 발생했어요.`
- 버튼: `다시 시도`
- 에러 메시지 (처리 실패): `PDF 변환 중 오류가 발생했어요. 다시 시도해주세요.`
- 에러 메시지 (메모리 부족): `파일이 너무 많거나 커서 처리할 수 없어요. 이미지 수를 줄여 다시 시도해주세요.`

### 신뢰 문구
- 하단 배지: `[Lock] 파일이 서버로 전송되지 않아요`

### 섹션 레이블
- `이미지 목록 ({N}개)`
- `페이지 크기`
- `출력 설정`

### GIF 애니메이션 안내
- 위치: GIF 파일 카드 하단 (파일명 아래)
- 텍스트: `애니메이션 GIF는 첫 번째 프레임만 사용돼요.`
- 스타일: `text-xs text-gray-500`

### EXIF 이슈 안내 (스마트폰 사진)
- MVP에서 별도 UI 안내 없음 (알려진 제약사항으로 문서화만, 팀 내부 공유)

---

## 12. 접근성 / 사용성 고려사항

### 키보드 접근성
- 파일 드롭존 + "이미지 추가" 버튼: Enter/Space로 파일 선택 다이얼로그 열기
- 드래그 핸들: 키보드로 순서 변경 (`Space` 픽업, 방향키 이동, `Space` 드롭) — dnd-kit 기본 지원
- X 버튼: Tab 포커스 가능, Enter로 제거
- 라디오 버튼: 방향키로 선택 전환

### ARIA
- 이미지 카드 에러: `role="alert"` (에러 메시지 p 태그)
- 처리 중 버튼: `aria-busy="true"`
- 에러 카드 최상단 div: `aria-invalid="true"`
- 완료/에러 카드: `role="status"` / `role="alert"`
- dnd-kit: 기본 ARIA 지원 (aria-grabbed, aria-dropeffect 자동 적용)

### 포커스 관리
- 완료 시: 완료 카드의 "다시 다운로드" 버튼으로 포커스 이동
- 에러 발생 시: 에러 카드로 포커스 이동
- "새 작업 시작": FileDropZone으로 포커스 이동
- 이미지 제거 시: 제거된 카드 다음/이전 카드의 X 버튼으로 포커스 이동

### 시각적 피드백
- 드래그 중: `opacity-50 shadow-lg cursor-grabbing`
- 드롭 위치: `border-t-2 border-blue-500` 인디케이터
- 드롭존 hover/active: `border-blue-500 bg-blue-50` (기존 FileDropZone 패턴)
- 페이지 크기 선택됨: `border-blue-500 bg-blue-50` (기존 라디오 카드 패턴)

---

## 13. PRD 요구사항 커버리지

| PRD ID | 요구사항 요약 | UX 반영 위치 |
|--------|-------------|------------|
| IP-01 | JPG/PNG/WebP/GIF/BMP 1개 이상 선택 | FileDropZone (multiple=true, accept 설정) |
| IP-02 | 드래그앤드롭 또는 파일 다이얼로그 | FileDropZone + "이미지 추가" 버튼 |
| IP-03 | 이미지 카드에 파일명 + 썸네일 표시 | ImageCard (Section 7.1) |
| IP-04 | 드래그앤드롭 순서 변경 | ImageCardList (dnd-kit), IP-S3 |
| IP-05 | 개별 이미지 제거 | ImageCard X 버튼 |
| IP-06 | 페이지 크기 선택: A4, Letter, 원본 | PageSizePicker (Section 7.2) |
| IP-07 | 선택 순서대로 각 이미지 → 1페이지 | useImageToPdf + imagesToPdf 로직 |
| IP-08 | A4/Letter 비율 유지 중앙 fit | 도메인 로직 (PDF_IMAGE_TO_PDF_SPEC Section 3.2) |
| IP-09 | 출력 파일명 기본값 + 변경 가능 | OutputNameInput, 자동 갱신 로직 (Section 7.3) |
| IP-10 | 처리 중 로딩 상태 | IP-S5 |
| IP-11 | 브라우저 로컬 처리 | 신뢰 배지 + 기능 정의 |

### AC 커버리지

| AC ID | 조건 요약 | UX 반영 |
|-------|---------|---------|
| AC-IP-01 | JPG 1장 → 1페이지 PDF | 기능 정의, 처리 로직 |
| AC-IP-02 | PNG/WebP/GIF → PDF 정상 생성 | 지원 포맷 테이블 (Section 2) |
| AC-IP-03 | 3장 업로드 시 카드에 파일명+썸네일 | ImageCard (Section 7.1) |
| AC-IP-04 | 드래그앤드롭 순서 변경 후 해당 순서로 PDF | dnd-kit 순서 = 변환 순서 |
| AC-IP-05 | 개별 삭제 버튼 → 목록 제거 | X 버튼 + handleRemove |
| AC-IP-06 | A4 선택 → 각 페이지 595×842pt | PageSizePicker + 도메인 로직 |
| AC-IP-07 | Letter 선택 → 각 페이지 612×792pt | PageSizePicker + 도메인 로직 |
| AC-IP-08 | 원본 크기 → 이미지 픽셀 크기 기반 | PageSizePicker + 도메인 로직 |
| AC-IP-09 | A4/Letter 선택 시 비율 유지 중앙 fit | 도메인 로직 (fitImageToA4) |
| AC-IP-10 | 출력 파일명 변경 → 해당 이름으로 다운로드 | OutputNameInput |
| AC-IP-11 | 이미지 없으면 버튼 비활성 | canConvert: hasValidImages |
| AC-IP-12 | 처리 중 로딩 인디케이터 | IP-S5 |
| AC-IP-13 | "새 작업 시작" → 초기 상태 | IP-S6 완료 카드 버튼 |
| AC-IP-14 | 네트워크 전송 없음 | 브라우저 전용 처리 |

---

## 14. 구현 팀을 위한 참고사항

### 파일 구조 (신규 생성 대상)
```
src/features/image-to-pdf/
├── ImageToPdfPage.tsx    ← 메인 페이지
├── useImageToPdf.ts      ← 상태 관리 훅
├── ImageCardList.tsx     ← dnd-kit 컨텍스트 + SortableContext
├── ImageCard.tsx         ← 개별 이미지 카드 (useSortable)
└── PageSizePicker.tsx    ← 페이지 크기 라디오 선택

src/lib/pdf/
├── imageToPdf.ts         ← 핵심 변환 로직 (PDF_IMAGE_TO_PDF_SPEC 참고)
└── validateImage.ts      ← 이미지 검증 함수
```

### App.tsx 수정 사항
1. `type Tab` 에 `'image-to-pdf'` 추가
2. 탭 바에 `"이미지→PDF"` 탭 항목 추가
3. `<ImageToPdfPage />` 조건부 렌더링 추가

### Reorder와의 차이점
| 항목 | Reorder | Image to PDF |
|------|---------|-------------|
| 드래그 대상 | 페이지 카드 (번호 표시) | 이미지 카드 (썸네일 표시) |
| 카드 내 콘텐츠 | 페이지 번호 + 파일 아이콘 | 썸네일 이미지 + 파일명 + 크기 |
| 에러 카드 | 없음 | 있음 (드래그 비활성) |
| "이미지 추가" | 없음 (드롭존 → 목록 교체) | 있음 (목록에 추가 방식) |
| 목록 → 드롭존 전환 | 파일 제거 시 교체 | 전체 제거 시 교체 |

### 썸네일 메모리 관리
- `URL.createObjectURL()` 생성 후 반드시 해제
- 해제 시점: 카드 제거 시, "새 작업 시작" 클릭 시, 컴포넌트 언마운트 시 (`useEffect` cleanup)
- 에러 카드는 previewUrl 없음 → revoke 불필요

### 출력 파일명 자동 갱신
- 이미지 추가/제거 시마다 자동 갱신
- 사용자가 직접 수정했으면 자동 갱신 중단 (isDirty 플래그 활용 권장)

---

## 15. 에지 케이스 처리

| 에지 케이스 ID | 상황 | UX 처리 |
|-------------|------|---------|
| E-IP-01 | 지원하지 않는 형식 (HEIC, TIFF, SVG 등) | 에러 카드 표시 (IP-S4), 버튼 비활성 |
| E-IP-02 | 손상된 이미지 | 에러 카드 표시 (IP-S4), X로 제거 가능 |
| E-IP-03 | 이미지 0개 | 버튼 비활성 (canConvert: hasValidImages) |
| E-IP-04 | 이미지 1장 | 정상 처리, 출력명 = 원본 파일명 |
| E-IP-05 | 이미지 50장 이상 | 처리 허용, 메모리 사용 주의 배너 표시 |
| E-IP-06 | 단일 파일 50MB 초과 | 에러 카드 표시, 업로드 거부 |
| E-IP-07 | 원본 크기 모드에서 이미지마다 크기 다름 | 허용, 페이지 크기 선택 힌트에 안내 |
| E-IP-08 | 투명 배경 PNG | 흰색 배경 처리 (도메인 로직, Section 7.1 참고) |
| E-IP-09 | 가로 방향 이미지 + A4 | 비율 유지하며 A4 내 fit (가로/세로 모두 기준) |
| E-IP-10 | 출력 파일명 비어있음 | 기본값 자동 복원 (`images.pdf`) |
| E-IP-11 | 출력 파일명 특수문자 | OutputNameInput 기존 sanitize 재사용 |
| E-IP-12 | 애니메이션 GIF | 첫 프레임만 사용 + 카드 내 안내 메시지 |
| E-IP-13 | 에러 카드 포함 상태에서 변환 시도 | 버튼 비활성으로 시도 불가 |
| E-IP-14 | 합산 파일 크기 200MB 초과 | 변환 버튼 클릭 시 에러 배너 표시 |
| E-IP-15 | 스마트폰 JPEG EXIF 회전 | MVP 미처리 (알려진 제약사항, 별도 UI 안내 없음) |

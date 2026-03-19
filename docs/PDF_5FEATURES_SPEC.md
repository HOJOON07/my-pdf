# 5개 신규 기능 도메인 로직 설계

> 버전: 1.0.0
> 작성일: 2026-03-19
> 작성자: PDF Domain Specialist
> 대상: Frontend Architect, Frontend Implementation, QA Engineer

---

## 1. PDF 잠금 해제 (Unlock)

### 1.1 pdf-lib password 옵션 존재 여부

pdf-lib ^1.17.1의 `PDFDocument.load()`는 **`password` 옵션을 지원하지 않는다**.

```typescript
// pdf-lib의 실제 LoadOptions 타입
interface LoadOptions {
  ignoreEncryption?: boolean   // 암호화 무시 (콘텐츠 손상 가능)
  parseSpeed?: ParseSpeeds
  throwOnInvalidObject?: boolean
  updateMetadata?: boolean
  capNumbers?: boolean
}
// 'password' 옵션 없음
```

**`ignoreEncryption: true`** 옵션은 존재하나, 이는 암호화를 "무시"하는 것이지 "해제"하는 것이 아니다.
- 암호화 딕셔너리를 건너뛰고 로드를 강제 시도
- 결과: 콘텐츠가 여전히 암호화된 상태로 로드됨 → 페이지 내용이 비어있거나 깨짐
- 이 방식으로 `save()`해도 암호화가 제거되지 않고 손상된 PDF가 생성됨

### 1.2 pdf-lib-plus-encrypt 지원 여부

`pdf-lib-plus-encrypt`는 npm에 존재하는 비공식 fork다.
암호화 PDF 생성 기능을 추가하지만, **비밀번호를 입력받아 암호화 PDF를 로드하는 기능은 포함되지 않는다**.

### 1.3 실제 Unlock 구현 방법

pdf-lib 단독으로는 비밀번호 입력 → 암호화 해제가 불가능하다.
**qpdf WASM**이 유일한 현실적 방법이다 (암호화 기술 조사 문서 `PDF_ENCRYPT_SPEC.md` 참조).

```
qpdf --decrypt --password=userpassword input.pdf output.pdf
```

qpdf WASM으로 `--decrypt` 명령을 실행하면:
1. 비밀번호로 암호화 PDF를 열고
2. 암호화 없이 새 PDF를 생성하여 저장한다

### 1.4 구현 방안

**방안 A: qpdf WASM 사용 (권장)**

암호화 기능(`PDF_ENCRYPT_SPEC.md`)에서 설계한 Web Worker 구조를 재활용한다.

```typescript
// src/workers/encrypt.worker.ts 재활용 — callMain 인자만 변경
qpdf.callMain([
  '--decrypt',
  `--password=${password}`,
  '/input.pdf',
  '/output.pdf',
])
```

Worker 메시지 타입:
```typescript
export interface UnlockRequest {
  type: 'unlock'
  pdfBuffer: ArrayBuffer   // Transferable
  password: string         // user password 또는 owner password
}
```

**방안 B: pdf-lib ignoreEncryption (비권장, 제한적)**

일부 RC4-40/RC4-128 암호화 PDF에서 `ignoreEncryption: true`로 로드 후 `save()`하면
의도치 않게 복호화된 것처럼 보이는 경우가 있다. 그러나 이는 정의되지 않은 동작이며
AES-128/256 암호화 PDF에서는 콘텐츠가 깨진다. **사용 금지.**

### 1.5 비밀번호 검증

잘못된 비밀번호를 qpdf에 전달하면 qpdf가 오류를 반환한다.
Worker에서 callMain의 종료 코드 또는 출력 파일 존재 여부로 성공/실패를 판단한다.

```typescript
try {
  qpdf.callMain([...])
  // 성공: /output.pdf 생성됨
  const result = qpdf.FS.readFile('/output.pdf')
} catch (e) {
  // 실패: 비밀번호 오류 또는 손상 파일
  throw new Error('비밀번호가 올바르지 않거나 파일을 열 수 없어요.')
}
```

### 1.6 파일명 규칙

| 파일명 규칙 | 예시 |
|-----------|------|
| `{원본파일명}_unlocked.pdf` | `report_unlocked.pdf` |

---

## 2. PDF 문서 정보 보기 (Info)

### 2.1 pdf-lib 메타데이터 API

pdf-lib는 `PDFDocument`에서 문서 정보를 읽는 getter를 제공한다.

```typescript
import { PDFDocument } from 'pdf-lib'

const doc = await PDFDocument.load(arrayBuffer)

// 모든 getter는 값이 없으면 undefined 반환
doc.getTitle()            // string | undefined
doc.getAuthor()           // string | undefined
doc.getSubject()          // string | undefined
doc.getKeywords()         // string | undefined  (쉼표 구분 문자열)
doc.getCreator()          // string | undefined  (작성 소프트웨어)
doc.getProducer()         // string | undefined  (PDF 생성 엔진)
doc.getCreationDate()     // Date | undefined
doc.getModificationDate() // Date | undefined
doc.getPageCount()        // number
```

### 2.2 PDF 버전 읽기

pdf-lib는 PDF 스펙 버전을 직접 읽는 공개 API가 없다.
PDF 파일의 첫 줄은 `%PDF-1.7` 또는 `%PDF-2.0` 형식이다.
ArrayBuffer에서 직접 읽을 수 있다.

```typescript
function readPdfVersion(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const header = new TextDecoder('latin1').decode(bytes.slice(0, 16))
  const match = header.match(/%PDF-(\d+\.\d+)/)
  return match ? match[1] : '알 수 없음'
}
```

### 2.3 파일 크기 및 페이지 수

```typescript
export interface PdfInfo {
  fileName: string
  fileSize: number          // bytes
  pdfVersion: string        // e.g. "1.7"
  pageCount: number
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
```

### 2.4 암호화 여부 감지

기존 `validate.ts`의 `isEncryptedPDF(arrayBuffer)` 함수를 재활용한다.

```typescript
// validate.ts 기존 구현 재활용
const encrypted = await isEncryptedPDF(arrayBuffer)
```

암호화된 PDF는 `PDFDocument.load()`가 실패하므로 메타데이터 읽기가 불가능하다.
`isEncryptedPDF`가 `true`를 반환하는 경우 `isEncrypted: true`만 표시하고 나머지는 표시 불가로 처리한다.

### 2.5 구현 함수

```typescript
// src/lib/pdf/info.ts
import { PDFDocument } from 'pdf-lib'
import { isEncryptedPDF } from './validate'
import type { PdfInfo } from '@/types/pdf'

export async function getPdfInfo(file: File): Promise<PdfInfo> {
  const arrayBuffer = await file.arrayBuffer()

  const encrypted = await isEncryptedPDF(arrayBuffer)
  if (encrypted) {
    return {
      fileName: file.name,
      fileSize: file.size,
      pdfVersion: readPdfVersion(arrayBuffer),
      pageCount: 0,
      isEncrypted: true,
    }
  }

  let doc: PDFDocument
  try {
    doc = await PDFDocument.load(arrayBuffer)
  } catch {
    throw new Error('PDF 파일을 읽을 수 없어요. 파일이 손상되었거나 올바른 PDF 형식이 아닐 수 있어요.')
  }

  return {
    fileName: file.name,
    fileSize: file.size,
    pdfVersion: readPdfVersion(arrayBuffer),
    pageCount: doc.getPageCount(),
    title: doc.getTitle(),
    author: doc.getAuthor(),
    subject: doc.getSubject(),
    keywords: doc.getKeywords(),
    creator: doc.getCreator(),
    producer: doc.getProducer(),
    creationDate: doc.getCreationDate(),
    modificationDate: doc.getModificationDate(),
    isEncrypted: false,
  }
}
```

### 2.6 Info 기능의 특이사항

- Info는 PDF를 수정하지 않는다. 출력 파일 없음.
- 결과를 UI에 표시만 하면 된다.
- `isEncrypted: true`인 경우 "이 파일은 비밀번호로 잠겨 있습니다." 안내.

---

## 3. 메타데이터 제거 (Remove Metadata)

### 3.1 pdf-lib setter로 빈값 설정

```typescript
import { PDFDocument } from 'pdf-lib'

const doc = await PDFDocument.load(arrayBuffer)

doc.setTitle('')
doc.setAuthor('')
doc.setSubject('')
doc.setKeywords([])      // 빈 배열
doc.setCreator('')
doc.setProducer('')
doc.setCreationDate(new Date(0))     // epoch로 설정 또는 제거 불가
doc.setModificationDate(new Date(0))
```

**`setKeywords`의 타입:** pdf-lib에서 `setKeywords`는 `string[]`을 받는다. `[]`로 설정하면 빈 키워드가 된다.

### 3.2 완전 제거 vs 빈값 설정의 차이

| 방법 | 결과 | pdf-lib 지원 |
|------|------|------------|
| 빈값 설정 (`setTitle('')`) | PDF에 빈 문자열 필드가 남음 | 지원 |
| 필드 완전 제거 | PDF 딕셔너리에서 키 자체가 삭제됨 | 미지원 (직접 구현 필요) |

**실질적 차이:** 대부분의 PDF 뷰어와 도구는 빈 문자열과 필드 없음을 동일하게 취급한다.
MVP에서는 **빈값 설정**으로 충분하다.

### 3.3 XMP 메타데이터

PDF는 두 가지 메타데이터 저장 방식을 가진다:
1. **Document Information Dictionary**: `setTitle()` 등 pdf-lib API가 다루는 방식
2. **XMP Metadata Stream**: XML 기반 별도 메타데이터 스트림 (`/Metadata` 스트림 객체)

pdf-lib는 XMP 메타데이터를 직접 편집하는 API를 제공하지 않는다.
그러나 `PDFDocument.create()` + `copyPages()`로 새 문서를 생성하면 XMP 스트림이 복사되지 않는다.

**완전한 메타데이터 제거를 원한다면:**
1. 기존 문서에서 setter로 빈값 설정 → 저장 (Document Info Dictionary 제거)
2. 또는 `PDFDocument.create()` + `copyPages()` 후 setter 미적용 → 새 문서에 XMP 없음

**권장 구현 (2번 방식):**

```typescript
export async function removeMetadata(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const srcDoc = await PDFDocument.load(arrayBuffer)
  const totalPages = srcDoc.getPageCount()

  // 새 문서 생성: XMP 스트림 미복사
  const newDoc = await PDFDocument.create()
  const allIndices = Array.from({ length: totalPages }, (_, i) => i)
  const copiedPages = await newDoc.copyPages(srcDoc, allIndices)
  copiedPages.forEach(page => newDoc.addPage(page))

  // Document Information Dictionary를 빈값으로 설정
  newDoc.setTitle('')
  newDoc.setAuthor('')
  newDoc.setSubject('')
  newDoc.setKeywords([])
  newDoc.setCreator('')
  newDoc.setProducer('vibe-pdf')   // 또는 ''

  return newDoc.save()
}
```

이 방식은 기존 `extractPages` 패턴과 동일하므로 추가 API 학습이 필요 없다.

### 3.4 파일명 규칙

| 파일명 규칙 | 예시 |
|-----------|------|
| `{원본파일명}_cleaned.pdf` | `report_cleaned.pdf` |

---

## 4. 페이지 번호 추가 (Add Page Numbers)

### 4.1 pdf-lib drawText API

```typescript
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const doc = await PDFDocument.load(arrayBuffer)
const font = await doc.embedFont(StandardFonts.Helvetica)

const page = doc.getPage(0)
const { width, height } = page.getSize()

page.drawText('1', {
  x: width / 2 - 5,    // 하단 중앙 (텍스트 너비 보정)
  y: 20,               // 하단에서 20pt
  size: 11,            // 폰트 크기
  font,
  color: rgb(0, 0, 0), // 검정
})
```

### 4.2 내장 폰트 목록

pdf-lib `StandardFonts` 열거형:

| 폰트 | 식별자 | 특성 |
|------|--------|------|
| Helvetica | `StandardFonts.Helvetica` | 산세리프, 숫자 표시에 적합 |
| Helvetica-Bold | `StandardFonts.HelveticaBold` | 굵은 산세리프 |
| Times Roman | `StandardFonts.TimesRoman` | 세리프 |
| Courier | `StandardFonts.Courier` | 모노스페이스 |

페이지 번호는 숫자만 표시하므로 **한글 폰트가 불필요하다**.
`StandardFonts.Helvetica`가 숫자 0-9를 완전히 지원한다.

### 4.3 텍스트 너비 계산 (중앙 정렬)

정확한 중앙 정렬을 위해 텍스트 너비를 계산해야 한다.

```typescript
const text = String(pageNumber)         // 예: "12"
const fontSize = 11
const textWidth = font.widthOfTextAtSize(text, fontSize)
const x = (pageWidth - textWidth) / 2  // 수평 중앙
```

### 4.4 페이지 크기별 번호 위치 계산

페이지 크기는 PDF마다 다를 수 있다 (A4, Letter, Legal 등).
고정 오프셋보다 비율 기반 위치 계산이 안전하다.

```typescript
export type PageNumberPosition = 'bottom-center' | 'bottom-left' | 'bottom-right'
                                | 'top-center' | 'top-left' | 'top-right'

const MARGIN = 20  // pt

function getPageNumberPosition(
  position: PageNumberPosition,
  pageWidth: number,
  pageHeight: number,
  textWidth: number,
  fontSize: number
): { x: number; y: number } {
  const positions: Record<PageNumberPosition, { x: number; y: number }> = {
    'bottom-center': { x: (pageWidth - textWidth) / 2, y: MARGIN },
    'bottom-left':   { x: MARGIN, y: MARGIN },
    'bottom-right':  { x: pageWidth - textWidth - MARGIN, y: MARGIN },
    'top-center':    { x: (pageWidth - textWidth) / 2, y: pageHeight - MARGIN - fontSize },
    'top-left':      { x: MARGIN, y: pageHeight - MARGIN - fontSize },
    'top-right':     { x: pageWidth - textWidth - MARGIN, y: pageHeight - MARGIN - fontSize },
  }
  return positions[position]
}
```

### 4.5 전체 구현

```typescript
export interface PageNumberOptions {
  position: PageNumberPosition
  fontSize: number          // 기본값: 11
  startNumber: number       // 시작 번호 (기본값: 1)
  format: 'number' | 'page-n-of-m'  // "1" 또는 "1 / 10"
}

export async function addPageNumbers(
  file: File,
  options: PageNumberOptions = { position: 'bottom-center', fontSize: 11, startNumber: 1, format: 'number' }
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const doc = await PDFDocument.load(arrayBuffer)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const totalPages = doc.getPageCount()

  for (let i = 0; i < totalPages; i++) {
    const page = doc.getPage(i)
    const { width, height } = page.getSize()
    const pageNum = options.startNumber + i

    const text = options.format === 'page-n-of-m'
      ? `${pageNum} / ${options.startNumber + totalPages - 1}`
      : String(pageNum)

    const textWidth = font.widthOfTextAtSize(text, options.fontSize)
    const { x, y } = getPageNumberPosition(options.position, width, height, textWidth, options.fontSize)

    page.drawText(text, {
      x, y,
      size: options.fontSize,
      font,
      color: rgb(0, 0, 0),
    })
  }

  return doc.save()
}
```

**중요:** `addPageNumbers`는 기존 `PDFDocument`를 직접 수정 후 `save()`한다.
`PDFDocument.create()` + `copyPages()` 패턴이 아니다.
이유: 페이지 번호는 기존 콘텐츠 위에 텍스트를 추가하는 것이므로 새 문서 생성이 불필요하다.

### 4.6 회전된 페이지 처리

페이지에 rotation이 설정되어 있으면 `getSize()`가 반환하는 width/height와 실제 뷰어 표시가 다를 수 있다.
90°/270° 회전된 페이지는 width와 height가 뒤바뀐 상태로 표시된다.

```typescript
const rotation = page.getRotation().angle
const { width: rawW, height: rawH } = page.getSize()
// 90° 또는 270° 회전 시 실제 표시 너비/높이가 뒤바뀜
const displayWidth = (rotation === 90 || rotation === 270) ? rawH : rawW
const displayHeight = (rotation === 90 || rotation === 270) ? rawW : rawH
```

MVP에서는 회전 페이지 처리를 포함하되, QA 테스트로 회전 페이지 케이스를 반드시 검증한다.

### 4.7 파일명 규칙

| 파일명 규칙 | 예시 |
|-----------|------|
| `{원본파일명}_numbered.pdf` | `report_numbered.pdf` |

---

## 5. 홀수/짝수 페이지 선택 (Odd/Even)

### 5.1 기존 extractPages 완전 재활용

홀수/짝수 추출은 인덱스 배열 생성만 다를 뿐, 핵심 로직은 기존 `extractPages`를 그대로 사용한다.

```typescript
import { extractPages } from './split'

// 홀수 페이지 (1, 3, 5, ... → 0-based: 0, 2, 4, ...)
export async function extractOddPages(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const srcDoc = await PDFDocument.load(arrayBuffer)
  const totalPages = srcDoc.getPageCount()

  const oddIndices = Array.from({ length: totalPages }, (_, i) => i)
    .filter(i => i % 2 === 0)   // 0-based에서 짝수 인덱스 = 1-based 홀수 페이지

  if (oddIndices.length === 0) {
    throw new Error('추출할 홀수 페이지가 없어요.')
  }

  return extractPages(file, oddIndices)
}

// 짝수 페이지 (2, 4, 6, ... → 0-based: 1, 3, 5, ...)
export async function extractEvenPages(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const srcDoc = await PDFDocument.load(arrayBuffer)
  const totalPages = srcDoc.getPageCount()

  const evenIndices = Array.from({ length: totalPages }, (_, i) => i)
    .filter(i => i % 2 === 1)   // 0-based에서 홀수 인덱스 = 1-based 짝수 페이지

  if (evenIndices.length === 0) {
    throw new Error('추출할 짝수 페이지가 없어요. 파일이 1페이지뿐이에요.')
  }

  return extractPages(file, evenIndices)
}
```

**인덱스 계산 명확화:**

| 1-based 페이지 번호 | 0-based 인덱스 | 홀/짝 |
|-----------------|--------------|------|
| 1 | 0 | 홀수 (0 % 2 === 0) |
| 2 | 1 | 짝수 (1 % 2 === 1) |
| 3 | 2 | 홀수 (2 % 2 === 0) |
| 4 | 3 | 짝수 (3 % 2 === 1) |

**정리:** 홀수 페이지 = 0-based 인덱스가 **짝수**인 것. 혼동하기 쉬우므로 코드에 주석 필수.

### 5.2 단일 구현 함수로 통합 (대안)

```typescript
export type OddEvenMode = 'odd' | 'even'

export async function extractOddOrEvenPages(
  file: File,
  mode: OddEvenMode
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const srcDoc = await PDFDocument.load(arrayBuffer)
  const totalPages = srcDoc.getPageCount()

  const indices = Array.from({ length: totalPages }, (_, i) => i)
    .filter(i => mode === 'odd' ? i % 2 === 0 : i % 2 === 1)

  if (indices.length === 0) {
    const label = mode === 'odd' ? '홀수' : '짝수'
    throw new Error(`추출할 ${label} 페이지가 없어요.`)
  }

  return extractPages(file, indices)
}
```

### 5.3 예외 케이스

| 케이스 | 처리 |
|--------|------|
| 총 1페이지, 짝수 추출 시도 | "추출할 짝수 페이지가 없어요. 파일이 1페이지뿐이에요." |
| 총 2페이지, 정상 동작 | 홀수: 1페이지 PDF, 짝수: 1페이지 PDF |
| 총 0페이지 | `validatePageCount`에서 사전 차단 |

### 5.4 파일명 규칙

| 모드 | 파일명 규칙 | 예시 |
|------|-----------|------|
| 홀수 | `{원본파일명}_odd.pdf` | `report_odd.pdf` |
| 짝수 | `{원본파일명}_even.pdf` | `report_even.pdf` |

---

## 6. 기존 코드 재활용 요약

| 기능 | 재활용 항목 | 신규 구현 |
|------|-----------|---------|
| Unlock | `encrypt.worker.ts` (qpdf `--decrypt`) | Worker 메시지 타입 추가 |
| Info | `isEncryptedPDF`, `PDFDocument.load()` | `getPdfInfo()`, `readPdfVersion()`, `PdfInfo` 타입 |
| Remove Metadata | `extractPages` 패턴 (copyPages) | `removeMetadata()` |
| Add Page Numbers | `PDFDocument.load()` | `addPageNumbers()`, `PageNumberOptions` 타입, `PageNumberPosition` 타입 |
| Odd/Even | `extractPages()` 완전 재활용 | `extractOddOrEvenPages()`, `OddEvenMode` 타입 |

---

## 7. 타입 추가 목록 (src/types/pdf.ts)

```typescript
// ActiveTab 추가
export type ActiveTab = 'merge' | 'split' | 'extract' | 'delete'
  | 'rotate' | 'reorder' | 'encrypt' | 'image-to-pdf'
  | 'unlock' | 'info' | 'remove-metadata' | 'add-page-numbers' | 'odd-even'

// Info 기능
export interface PdfInfo {
  fileName: string
  fileSize: number
  pdfVersion: string
  pageCount: number
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

// Add Page Numbers
export type PageNumberPosition =
  | 'bottom-center' | 'bottom-left' | 'bottom-right'
  | 'top-center' | 'top-left' | 'top-right'

export interface PageNumberOptions {
  position: PageNumberPosition
  fontSize: number
  startNumber: number
  format: 'number' | 'page-n-of-m'
}

// Odd/Even
export type OddEvenMode = 'odd' | 'even'
```

---

## 8. 신규 파일 목록

| 파일 | 포함 함수 |
|------|---------|
| `src/lib/pdf/info.ts` | `getPdfInfo()`, `readPdfVersion()` |
| `src/lib/pdf/metadata.ts` | `removeMetadata()` |
| `src/lib/pdf/pageNumbers.ts` | `addPageNumbers()`, `getPageNumberPosition()` |
| `src/lib/pdf/oddEven.ts` | `extractOddOrEvenPages()` |
| `src/workers/encrypt.worker.ts` | Unlock 지원: `--decrypt` 분기 추가 |

---

## 9. 구현 주의사항 요약

| 기능 | 핵심 주의사항 |
|------|-------------|
| Unlock | pdf-lib 단독 불가. qpdf WASM `--decrypt` 사용. 비밀번호 오류 시 명확한 에러 처리. |
| Info | 암호화 파일은 메타데이터 읽기 불가 → `isEncrypted: true`만 표시. `getCreationDate()` 반환값이 Date 객체이므로 UI에서 포맷팅 필요. |
| Remove Metadata | `PDFDocument.create()` + `copyPages()` 방식이 XMP까지 제거하므로 setter만 사용하는 방식보다 완전함. |
| Add Page Numbers | `font.widthOfTextAtSize(text, size)`로 텍스트 너비 계산하여 정확한 중앙 정렬. 회전 페이지 좌표 보정 필요. |
| Odd/Even | 0-based 인덱스에서 홀수 페이지 = 짝수 인덱스. 코드 주석 필수. `extractPages` 완전 재활용. |

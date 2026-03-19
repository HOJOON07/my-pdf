# PDF 페이지 회전/순서 바꾸기 도메인 로직 설계

> 버전: 1.0.0
> 작성일: 2026-03-19
> 작성자: PDF Domain Specialist
> 대상: Frontend Architect, Frontend Implementation, QA Engineer

---

## 1. 기능 정의

| 기능 | 설명 | 출력 |
|------|------|------|
| **Rotate (페이지 회전)** | 지정 페이지를 90°/180°/270° 회전하여 새 PDF 생성 | 단일 PDF |
| **Reorder (페이지 순서 바꾸기)** | 사용자가 지정한 순서로 페이지를 재배열하여 새 PDF 생성 | 단일 PDF |

---

## 2. Rotate (페이지 회전)

### 2.1 pdf-lib API

pdf-lib는 `PDFPage.setRotation(degrees(angle))` API를 제공한다.

```typescript
import { PDFDocument, degrees } from 'pdf-lib'
```

- `degrees(n)`: pdf-lib의 `Rotation` 타입 생성 헬퍼. n은 정수 각도 (0, 90, 180, 270)
- `page.getRotation()`: 현재 페이지의 `Rotation` 객체 반환 (`.angle` 프로퍼티로 숫자 획득)
- `page.setRotation(degrees(n))`: 페이지 회전각 설정

### 2.2 기존 회전값 처리 (누적 회전)

PDF 페이지는 기존 회전값(existing rotation)을 가질 수 있다.
사용자가 "90° 회전"을 요청할 때 기존 회전값을 무시하면 시각적 결과가 의도와 다를 수 있다.

**올바른 처리: 기존 회전값에 추가 회전값을 누적하고 360으로 mod 처리**

```typescript
function getAccumulatedRotation(page: PDFPage, addDegrees: number): number {
  const existing = page.getRotation().angle  // 0, 90, 180, 270 중 하나
  return (existing + addDegrees) % 360
}
```

**예시:**
- 기존 90° 페이지에 90° 추가 → 180°
- 기존 270° 페이지에 90° 추가 → (360) % 360 = 0°

### 2.3 구현: 페이지별 개별 회전

사용자가 특정 페이지에 서로 다른 회전 각도를 적용하는 방식.

```typescript
import { PDFDocument, degrees } from 'pdf-lib'

/** 페이지별 회전 지시 */
export interface PageRotation {
  /** 0-based 페이지 인덱스 */
  pageIndex: number
  /** 추가할 회전 각도: 90 | 180 | 270 */
  rotateDegrees: 90 | 180 | 270
}

/**
 * 지정한 페이지들을 각각 회전하여 새 PDF 반환.
 * 회전 지시가 없는 페이지는 원본 회전값 유지.
 */
export async function rotatePages(file: File, rotations: PageRotation[]): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const srcDoc = await PDFDocument.load(arrayBuffer)
  const totalPages = srcDoc.getPageCount()

  // 범위 검증
  for (const r of rotations) {
    if (r.pageIndex < 0 || r.pageIndex >= totalPages) {
      throw new Error(`페이지 인덱스 ${r.pageIndex + 1}이 범위를 벗어났어요.`)
    }
  }

  // 새 문서에 전체 페이지 복사
  const newDoc = await PDFDocument.create()
  const allIndices = Array.from({ length: totalPages }, (_, i) => i)
  const copiedPages = await newDoc.copyPages(srcDoc, allIndices)
  copiedPages.forEach(page => newDoc.addPage(page))

  // 회전 적용 (누적 방식)
  const rotationMap = new Map(rotations.map(r => [r.pageIndex, r.rotateDegrees]))
  for (const [idx, addDeg] of rotationMap) {
    const page = newDoc.getPage(idx)
    const existing = page.getRotation().angle
    page.setRotation(degrees((existing + addDeg) % 360))
  }

  return newDoc.save()
}
```

### 2.4 구현: 전체 일괄 회전

모든 페이지에 동일한 회전 각도를 적용하는 방식.
`rotatePages`에 전체 인덱스를 담아 호출하는 것으로 구현 가능하므로 별도 함수 불필요.

```typescript
// 전체 일괄 회전 사용 예 (호출부에서 처리)
const allRotations: PageRotation[] = Array.from({ length: totalPages }, (_, i) => ({
  pageIndex: i,
  rotateDegrees: 90,
}))
await rotatePages(file, allRotations)
```

### 2.5 회전 관련 주의사항

**copyPages 후 setRotation 순서:**
`newDoc.copyPages(srcDoc, indices)` 후 `newDoc.addPage(page)` 한 뒤에 `newDoc.getPage(idx).setRotation()`을 호출해야 한다. `copyPages`로 얻은 `PDFPage` 객체에 직접 `setRotation`을 호출하면 `addPage` 전에는 문서에 소속되지 않아 결과가 반영되지 않을 수 있다.

**pdf-lib의 rotation은 뷰어 표시용:**
PDF 스펙에서 페이지 회전(Rotate entry)은 뷰어가 페이지를 표시할 때 적용하는 값이다. 실제 페이지 콘텐츠 스트림을 변환하지 않는다. 모든 주요 PDF 뷰어는 이 값을 올바르게 처리한다.

**허용 각도:**
pdf-lib의 `degrees()` 헬퍼는 임의 정수를 받지만, PDF 스펙상 Rotate 값은 90의 배수(0, 90, 180, 270)만 유효하다. 다른 값은 뷰어에 따라 무시될 수 있다. 입력을 90 | 180 | 270으로 제한한다.

---

## 3. Reorder (페이지 순서 바꾸기)

### 3.1 pdf-lib API

Reorder는 `copyPages`에 원하는 순서의 인덱스 배열을 전달하는 것으로 구현한다.
**별도 API가 필요하지 않다.** 기존 `extractPages` 패턴과 구조가 동일하다.

```typescript
import { PDFDocument } from 'pdf-lib'

/**
 * 지정한 순서(0-based 인덱스 배열)로 페이지를 재배열한 PDF 반환.
 * orderedIndices는 중복 없이 전체 페이지를 포함해야 한다.
 */
export async function reorderPages(file: File, orderedIndices: number[]): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const srcDoc = await PDFDocument.load(arrayBuffer)
  const totalPages = srcDoc.getPageCount()

  // 검증: 길이 일치
  if (orderedIndices.length !== totalPages) {
    throw new Error(`페이지 순서 배열 길이(${orderedIndices.length})가 전체 페이지 수(${totalPages})와 달라요.`)
  }

  // 검증: 중복 없이 0 ~ totalPages-1 범위 내 모든 인덱스 포함
  const indexSet = new Set(orderedIndices)
  if (indexSet.size !== totalPages) {
    throw new Error('페이지 순서에 중복이 있어요. 각 페이지는 한 번씩만 포함되어야 해요.')
  }
  for (const idx of orderedIndices) {
    if (idx < 0 || idx >= totalPages) {
      throw new Error(`페이지 인덱스 ${idx + 1}이 범위를 벗어났어요.`)
    }
  }

  const newDoc = await PDFDocument.create()
  const copiedPages = await newDoc.copyPages(srcDoc, orderedIndices)
  copiedPages.forEach(page => newDoc.addPage(page))
  return newDoc.save()
}
```

### 3.2 기존 extractPages 패턴과의 유사성

| 항목 | extractPages | reorderPages |
|------|-------------|--------------|
| 핵심 API | `copyPages(srcDoc, indices)` | `copyPages(srcDoc, orderedIndices)` |
| 인덱스 의미 | 추출할 페이지 부분집합 | 전체 페이지의 새 순서 |
| 인덱스 길이 | 1 ~ totalPages (부분 가능) | totalPages와 동일 (전체 필수) |
| 중복 허용 | 파서에서 제거됨 | 에러 처리 (중복 = 논리 오류) |
| 출력 페이지 수 | 입력 인덱스 수 | totalPages와 동일 |

**핵심 차이:** `copyPages`에 전달하는 인덱스 배열이 "부분집합인가, 전체 재배열인가"의 차이뿐이다. 코드 패턴은 동일하다.

### 3.3 UI에서 orderedIndices 생성

UI에서 사용자가 드래그로 페이지를 재배열하면 다음과 같이 인덱스 배열을 구성한다.

```typescript
// 예: 3페이지 PDF에서 사용자가 [페이지3, 페이지1, 페이지2] 순으로 변경
const orderedIndices = [2, 0, 1]  // 0-based
await reorderPages(file, orderedIndices)
```

---

## 4. 메타데이터 및 북마크 유지 여부

### 4.1 copyPages의 복사 범위

`copyPages`가 복사하는 것:
- 페이지 콘텐츠 스트림 (텍스트, 이미지, 벡터)
- 폰트 및 리소스
- 어노테이션 (주석, 링크 등)
- 페이지 미디어박스, 크롭박스 등 치수 정보
- 페이지 회전값 (Rotate entry)

`copyPages`가 복사하지 않는 것:
- **문서 레벨 북마크 (아웃라인/목차)**: 페이지 인덱스 참조가 변경되면 북마크가 깨질 수 있음
- **문서 메타데이터** (Title, Author, Subject 등): 새 PDFDocument는 메타데이터 없이 생성됨
- **문서 레벨 JavaScript**: 인터랙티브 PDF의 JS는 복사되지 않음
- **양식(Form) 필드**: 부분적으로 복사되나 완전한 보장 없음

### 4.2 MVP 정책 결정

| 항목 | 정책 | 이유 |
|------|------|------|
| 북마크 (아웃라인) | 유지하지 않음 | pdf-lib의 `copyPages`가 자동 이전하지 않으며, 재구성 로직이 MVP 범위 초과 |
| 문서 메타데이터 | 유지하지 않음 | 새 PDFDocument 생성 시 빈 메타데이터, MVP 범위 외 |
| 어노테이션 | 유지됨 (자동) | `copyPages`가 페이지 어노테이션을 복사함 |
| 폰트/이미지 | 유지됨 (자동) | `copyPages`가 리소스를 함께 복사함 |

**UX 안내 필요:** 북마크(목차)가 있는 PDF를 Reorder/Rotate하면 북마크가 사라진다는 것을 사용자에게 고지해야 한다.

---

## 5. 예외 케이스 및 제약사항

### 5.1 Rotate 예외

| 케이스 | 처리 |
|--------|------|
| 회전 대상 페이지 없음 (빈 rotations 배열) | 원본과 동일한 PDF 반환 — 에러 없음. UI에서 "변경된 페이지가 없습니다" 안내 가능 |
| 범위 초과 인덱스 | `rotatePages` 내에서 에러 throw |
| 90의 배수가 아닌 각도 | TypeScript 타입으로 90 \| 180 \| 270 강제 → 컴파일 시 차단 |
| 기존 회전값이 없는 페이지 | `page.getRotation().angle` = 0 반환 — 정상 동작 |

### 5.2 Reorder 예외

| 케이스 | 처리 |
|--------|------|
| 인덱스 배열 길이 != totalPages | 에러: "페이지 순서 배열 길이가 전체 페이지 수와 달라요." |
| 중복 인덱스 포함 | 에러: "중복이 있어요. 각 페이지는 한 번씩만 포함되어야 해요." |
| 범위 초과 인덱스 | 에러: "페이지 인덱스 N이 범위를 벗어났어요." |
| 원본과 동일한 순서 | 에러 없음, 정상 처리 (원본과 동일한 PDF 출력) |
| 1페이지 PDF | 에러 없음 — [0]이 유일한 유효 입력 |

### 5.3 공통 예외 (기존 validate.ts 재활용)

| 케이스 | 처리 |
|--------|------|
| 암호화 파일 | `PDFDocument.load()` 에러 → 기존 패턴 그대로 |
| 손상 파일 | `PDFDocument.load()` 에러 → 기존 패턴 그대로 |
| 잘못된 MIME | `validateFileType`으로 거부 |
| 0페이지 파일 | `validatePageCount`로 에러 |
| 파일 크기 초과 | `checkSingleFileSizePolicy`로 거부 |

---

## 6. 기존 코드와의 공통점/차이점 요약

### 6.1 공통점

| 항목 | Rotate | Reorder | 기존 (split/merge) |
|------|--------|---------|-------------------|
| 핵심 API | `copyPages` | `copyPages` | `copyPages` |
| 파일 로드 패턴 | 동일 | 동일 | 동일 |
| 예외 처리 패턴 | 동일 | 동일 | 동일 |
| 출력 | 단일 Uint8Array | 단일 Uint8Array | 단일 또는 배열 |
| validate.ts 재활용 | 가능 | 가능 | 기반 |

### 6.2 차이점

| 항목 | Rotate | Reorder |
|------|--------|---------|
| 추가 API | `degrees()`, `page.setRotation()`, `page.getRotation()` | 없음 |
| 인덱스 역할 | 회전 대상 + 회전값 매핑 | 새 페이지 순서 |
| 전체 페이지 처리 | 전체 복사 후 일부 페이지만 회전 | 전체 페이지 순서 재배열 |
| 검증 복잡도 | 회전각 타입 제한 | 중복 없는 전체 인덱스 포함 검증 |
| 신규 타입 필요 | `PageRotation` 인터페이스 | 없음 (`number[]`만 사용) |

---

## 7. 파일명 생성 규칙

| 기능 | 파일명 규칙 | 예시 |
|------|-----------|------|
| Rotate | `{원본파일명}_rotated.pdf` | `report_rotated.pdf` |
| Reorder | `{원본파일명}_reordered.pdf` | `report_reordered.pdf` |

---

## 8. 구현 체크리스트 (개발팀 전달)

### 8.1 신규 구현 항목

- [ ] `src/types/pdf.ts`에 `PageRotation` 인터페이스 추가
- [ ] `src/types/pdf.ts`의 `ActiveTab`에 `'rotate' | 'reorder'` 추가
- [ ] `src/lib/pdf/` 에 `rotate.ts` 신규 생성 → `rotatePages(file, rotations)` 함수
- [ ] `src/lib/pdf/` 에 `reorder.ts` 신규 생성 → `reorderPages(file, orderedIndices)` 함수
  - 또는 기존 `split.ts`에 추가하는 방안도 가능 (팀 판단)

### 8.2 재활용 항목 (신규 구현 불필요)

- `validate.ts` 전체 — 파일 타입, 크기, 페이지 수 검증
- `PDFDocument.load()` 에러 처리 패턴 — `split.ts`의 `loadPdfDocument` 함수 참조
- `copyPages` + `addPage` 패턴

### 8.3 주의사항

**Rotate:**
- `copyPages`로 페이지를 `newDoc`에 추가한 **후에** `newDoc.getPage(idx).setRotation()`을 호출해야 한다. `copiedPages[i].setRotation()` 방식(addPage 전)도 동작하나 `newDoc.getPage(idx)` 방식이 더 명확하다.
- `degrees` 임포트를 잊지 말 것: `import { PDFDocument, degrees } from 'pdf-lib'`
- 누적 회전 계산: `(existing + addDegrees) % 360` — 기존 회전값 반드시 반영

**Reorder:**
- UI에서 드래그 결과를 0-based 인덱스 배열로 변환해서 전달해야 한다
- 순서가 변경되지 않은 경우에도 정상 처리 (원본과 동일한 PDF 출력)
- 북마크 손실을 사용자에게 명시적으로 고지할 것

---

## 9. 요약

| 항목 | Rotate | Reorder |
|------|--------|---------|
| 신규 API | `degrees()`, `setRotation()`, `getRotation()` | 없음 |
| 기존 패턴 재활용 | `copyPages` + 이후 `setRotation` 추가 | `copyPages` 그대로 |
| 신규 파일 | `rotate.ts` | `reorder.ts` |
| 신규 타입 | `PageRotation` | 없음 |
| 핵심 주의점 | 기존 회전값 누적 처리, `addPage` 후 `setRotation` | 중복 없는 전체 인덱스 검증, 북마크 손실 고지 |

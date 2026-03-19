# PDF 페이지 추출/삭제 도메인 로직 설계

> 버전: 1.0.0
> 작성일: 2026-03-19
> 작성자: PDF Domain Specialist
> 대상: Frontend Architect, Frontend Implementation, QA Engineer

---

## 1. 기능 정의

| 기능 | 설명 | 출력 |
|------|------|------|
| **Extract (페이지 추출)** | 사용자가 지정한 페이지만 뽑아 새 PDF 생성 | 단일 PDF |
| **Delete (페이지 삭제)** | 사용자가 지정한 페이지를 제거한 나머지 PDF 생성 | 단일 PDF |

두 기능 모두 단일 PDF 파일을 입력으로 받아 단일 PDF 파일을 출력한다.

---

## 2. pdf-lib API 사용법

### 2.1 핵심 API: `copyPages`

두 기능 모두 동일한 pdf-lib API 패턴을 사용한다.

```typescript
import { PDFDocument } from 'pdf-lib'

// 공통 패턴: 인덱스 배열을 받아 새 PDF 생성
async function buildPdfFromIndices(file: File, indices: number[]): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const srcDoc = await PDFDocument.load(arrayBuffer)
  const newDoc = await PDFDocument.create()
  const copiedPages = await newDoc.copyPages(srcDoc, indices)
  copiedPages.forEach(page => newDoc.addPage(page))
  return newDoc.save()
}
```

- `copyPages(srcDoc, indices)`: 소스 문서에서 지정한 0-based 인덱스 페이지를 대상 문서로 복사
- `indices` 배열 순서가 출력 PDF의 페이지 순서를 결정한다
- 폰트, 이미지, 어노테이션이 함께 복사된다

### 2.2 Extract 구현

지정 인덱스를 그대로 `copyPages`에 전달한다.

```typescript
// src/lib/pdf/split.ts의 extractPages 함수가 이미 이 역할을 수행
export async function extractPages(file: File, indices: number[]): Promise<Uint8Array>
```

**현황:** `split.ts`의 `extractPages` 함수가 Extract 로직을 이미 구현하고 있다.
신규 구현 없이 기존 함수를 재활용한다.

### 2.3 Delete 구현

전체 인덱스에서 삭제 대상 인덱스를 제외한 나머지를 `copyPages`에 전달한다.

```typescript
// src/lib/pdf/split.ts에 추가할 함수
export async function deletePages(file: File, indicesToDelete: number[]): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const srcDoc = await PDFDocument.load(arrayBuffer)
  const totalPages = srcDoc.getPageCount()

  const deleteSet = new Set(indicesToDelete)
  const remainingIndices = Array.from({ length: totalPages }, (_, i) => i)
    .filter(i => !deleteSet.has(i))

  if (remainingIndices.length === 0) {
    throw new Error('모든 페이지를 삭제하면 PDF가 빈 파일이 돼요. 삭제할 페이지를 다시 선택해 주세요.')
  }

  const newDoc = await PDFDocument.create()
  const copiedPages = await newDoc.copyPages(srcDoc, remainingIndices)
  copiedPages.forEach(page => newDoc.addPage(page))
  return newDoc.save()
}
```

**핵심 차이:** Extract는 "포함할 인덱스", Delete는 "제외할 인덱스"를 입력받는다.
내부적으로는 동일하게 `copyPages`를 호출한다.

---

## 3. 기존 split.ts 로직과의 차이점/공통점

### 3.1 공통점

| 항목 | Extract | Delete | 기존 Split |
|------|---------|--------|-----------|
| 사용 API | `copyPages` | `copyPages` | `copyPages` |
| 입력 | 단일 File | 단일 File | 단일 File |
| 출력 | 단일 Uint8Array | 단일 Uint8Array | Uint8Array[] |
| 파일 로드 패턴 | 동일 | 동일 | 동일 |
| 예외 처리 | 동일 | 동일 | 동일 |

### 3.2 차이점

| 항목 | Extract | Delete | 기존 Split(range) |
|------|---------|--------|-----------------|
| 인덱스 계산 | 입력값 직접 사용 | 전체 - 삭제 대상 | 그룹별 반복 |
| 출력 파일 수 | 항상 1개 | 항상 1개 | 범위 그룹 수만큼 |
| 빈 결과 처리 | 불필요 (입력 인덱스 >= 1) | 필수 (전부 삭제 시 에러) | 불필요 |

### 3.3 코드 배치 결정

- `extractPages`는 이미 `split.ts`에 존재 — 그대로 사용
- `deletePages`는 `split.ts`에 신규 추가
- 별도 파일(`extract.ts`, `delete.ts`) 생성 불필요 — split 도메인 내 로직이므로 `split.ts`가 적절

---

## 4. 페이지 범위 파싱 규칙

### 4.1 기존 pageRange.ts 재활용 가능 여부

**결론: 완전히 재활용 가능하다.** 신규 파싱 로직이 필요 없다.

| 함수 | Extract 활용 | Delete 활용 |
|------|------------|------------|
| `parsePageRanges(input, totalPages)` | 추출할 인덱스 배열 획득 | 삭제할 인덱스 배열 획득 |
| `parseRangesIntoGroups(input, totalPages)` | 필요 없음 | 필요 없음 |
| `validateRangeInput(input, totalPages)` | 실시간 입력 검증 | 실시간 입력 검증 |

두 기능 모두 단일 평탄 인덱스 배열(`parsePageRanges`)만 필요하다.

### 4.2 입력 형식 (기존과 동일)

| 형식 | 예시 | 의미 |
|------|------|------|
| 단일 페이지 | `3` | 3페이지만 |
| 범위 | `1-5` | 1~5페이지 |
| 복합 (콤마 구분) | `1-3, 5, 7-10` | 1~3, 5, 7~10페이지 |

### 4.3 Extract vs Delete 입력 의미 차이

동일한 입력 `"1-3, 5"` (총 7페이지 파일 기준):

- **Extract**: 1~3, 5페이지를 포함한 PDF 생성 (4페이지 출력)
- **Delete**: 1~3, 5페이지를 제거한 PDF 생성 (4, 6, 7페이지 → 3페이지 출력)

UI에서 레이블을 명확히 구분해야 한다 ("추출할 페이지" vs "삭제할 페이지").

---

## 5. 예외 케이스 및 제약사항

### 5.1 Extract 전용 예외

| 케이스 | 처리 |
|--------|------|
| 입력이 비어있음 | 실행 버튼 비활성화 또는 "페이지 범위를 입력해 주세요." |
| 범위 초과 | `parsePageRanges`에서 에러 throw — 인라인 표시 |
| 역순 범위 (e.g. `5-3`) | `parsePageRanges`에서 에러 throw |
| 0페이지 입력 | `parsePageRanges`에서 에러 throw |

### 5.2 Delete 전용 예외

| 케이스 | 처리 |
|--------|------|
| 전체 페이지 삭제 | `deletePages` 내에서 에러: "모든 페이지를 삭제하면 PDF가 빈 파일이 돼요." |
| 1페이지 파일에서 1페이지 삭제 | 위 케이스에 해당 — 동일하게 처리 |
| 존재하지 않는 페이지 삭제 | `parsePageRanges`에서 범위 초과 에러로 처리됨 |

### 5.3 공통 예외 (기존 validate.ts 재활용)

| 케이스 | 발생 시점 | 처리 |
|--------|----------|------|
| 암호화 파일 | `PDFDocument.load()` | 에러 메시지 + 처리 중단 |
| 손상 파일 | `PDFDocument.load()` | 에러 메시지 + 처리 중단 |
| 잘못된 MIME | 업로드 시 | `validateFileType`으로 파일 거부 |
| 0페이지 파일 | `load()` 후 | `validatePageCount`로 에러 throw |
| 파일 크기 초과 | 업로드 시 | `checkSingleFileSizePolicy`로 거부 |

### 5.4 Extract/Delete 공통 제약사항

- **1페이지 결과 허용**: Extract 결과가 1페이지여도 유효한 PDF다.
- **페이지 순서 유지**: Extract 시 입력 범위가 `1-3, 7-9`이면 출력은 1→2→3→7→8→9 순서다. 범위 역순 입력(`9-7`)은 파서에서 에러로 차단하므로 페이지 재배열 기능은 제공하지 않는다.
- **중복 인덱스**: `parsePageRanges`는 Set으로 중복 제거 후 정렬하므로 `1,1,2` 입력 시 `[0,1]`이 반환된다. Delete에서도 동일하게 적용된다.

---

## 6. 파일명 생성 규칙

| 기능 | 파일명 규칙 | 예시 |
|------|-----------|------|
| Extract | `{원본파일명}_extracted_{범위}.pdf` | `report_extracted_1-3.pdf` |
| Delete | `{원본파일명}_deleted_{범위}.pdf` | `report_deleted_2-4.pdf` |

범위가 복합인 경우 (`1-3, 5`) 파일명에는 콤마 대신 하이픈 연결로 축약: `report_extracted_1-3_5.pdf`

---

## 7. 구현 체크리스트 (개발팀 전달)

### 7.1 신규 구현 항목

- [ ] `src/lib/pdf/split.ts`에 `deletePages(file, indicesToDelete)` 함수 추가
- [ ] Delete에서 "전체 페이지 삭제" 시 에러 처리 확인
- [ ] Extract/Delete UI 컴포넌트에서 `parsePageRanges` + `validateRangeInput` 연결

### 7.2 재활용 가능 항목 (신규 구현 불필요)

- `extractPages` — `split.ts`에 이미 존재
- `parsePageRanges`, `validateRangeInput` — `pageRange.ts`에 이미 존재
- `validateFileType`, `checkSingleFileSizePolicy`, `validatePageCount` — `validate.ts`에 이미 존재
- 암호화/손상 파일 에러 처리 패턴 — `split.ts`, `merge.ts`에 동일 패턴 존재

### 7.3 주의사항

- `deletePages`에서 `loadPdfDocument` 내부 함수를 직접 사용할 수 없으므로 (unexported), `PDFDocument.load` 직접 호출 + try-catch 또는 `loadPdfDocument`를 export로 변경하는 방안 중 선택
- Delete 로직에서 `Array.from + filter` 패턴은 O(n)이므로 수백 페이지에서도 성능 문제 없음
- Extract와 Delete 모두 단일 파일 입력이므로 `checkSingleFileSizePolicy` 사용 (`checkFileSizePolicy` 아님)

---

## 8. 요약

| 항목 | Extract | Delete |
|------|---------|--------|
| 기존 코드 재활용 | `extractPages` 그대로 사용 | `deletePages` 신규 추가 (5줄) |
| 파싱 로직 | `parsePageRanges` 재활용 | `parsePageRanges` 재활용 |
| 검증 로직 | `validateRangeInput` 재활용 | `validateRangeInput` 재활용 |
| 핵심 차이 | 포함할 인덱스 전달 | 제외할 인덱스 계산 후 나머지 전달 |
| 추가 에러 케이스 | 없음 | 전체 페이지 삭제 시 에러 |

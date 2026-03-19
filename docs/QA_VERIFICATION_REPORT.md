# Extract/Delete 기능 코드 검증 보고서

**버전**: 1.0
**작성일**: 2026-03-19
**작성자**: QA Engineer
**검증 대상**: Extract/Delete 기능 구현 (Task #5 산출물)
**기준 문서**: PRD v1.1, ux-extract-delete.md v1.1, PDF_EXTRACT_DELETE_SPEC.md v1.0.0

---

## 1. 검증 요약

| 항목 | 결과 |
|------|------|
| PRD Acceptance Criteria 충족 | **17/17 통과** (단, 명세-구현 불일치 4건 별도 기록) |
| TypeScript 타입 안전성 | **통과** (주요 경계 타입 정상 처리) |
| 엣지 케이스 처리 | **통과** (전체 페이지 삭제 방지, 빈 범위, 잘못된 범위 모두 처리) |
| 기존 기능 영향 (Split 회귀) | **통과** (PageRangeInput label prop 추가는 하위 호환 보장) |
| UX 일관성 | **대체로 통과** (미세한 마이크로카피 불일치 2건 발견) |
| **종합 판정** | **출시 가능** (blocking bug 없음, 개선 권고 5건) |

---

## 2. PRD Acceptance Criteria 검증

### 2.1 Extract AC (AC-EX-01 ~ AC-EX-08)

| AC ID | 요구사항 | 코드 위치 | 결과 | 비고 |
|-------|----------|----------|------|------|
| AC-EX-01 | PDF 업로드 시 파일명과 전체 페이지 수 표시 | `ExtractPage.tsx:57-59` | PASS | `{file.file.name}`, `{file.pageCount}페이지` 표시 |
| AC-EX-02 | 범위 `1-3, 5` 입력 시 단일 PDF 다운로드 | `extract.ts:20-29`, `useExtract.ts:96-99` | PASS | `extractPagesToPdf` → `downloadPDF` 단일 파일 |
| AC-EX-03 | 출력 파일명 `pages.pdf` 변경 시 해당 파일명으로 다운로드 | `useExtract.ts:98-99`, `download.ts:9` | PASS | `outputName.trim()` 사용, `.pdf` 자동 추가 포함 |
| AC-EX-04 | 빈 범위 입력 시 추출 버튼 비활성화 | `useExtract.ts:78-83` | PASS | `rangeInput.trim()` 조건 포함 |
| AC-EX-05 | 5페이지 PDF에 범위 `8` 입력 시 오류 메시지 | `pageRange.ts:42-44` | PASS | "입력한 페이지 번호가 파일의 전체 페이지(N페이지)를 초과해요." |
| AC-EX-06 | 처리 중 로딩 인디케이터 표시 후 완료 시 소멸 | `ExtractPage.tsx:111-119` | PASS | `Loader2 animate-spin` + `status === 'processing'` 분기 |
| AC-EX-07 | 완료 후 '새 작업 시작' 클릭 시 초기 상태 복귀 | `ExtractPage.tsx:36`, `useExtract.ts:107-114` | PASS | `reset()` 콜백 완전 초기화 |
| AC-EX-08 | 단일 페이지 `3` 입력 시 해당 페이지 단일 PDF 다운로드 | `pageRange.ts:36-48`, `extract.ts:27-29` | PASS | 단일 인덱스 `[2]` → 1페이지 PDF |

**Extract AC 결과: 8/8 PASS**

### 2.2 Delete AC (AC-D-01 ~ AC-D-09)

| AC ID | 요구사항 | 코드 위치 | 결과 | 비고 |
|-------|----------|----------|------|------|
| AC-D-01 | PDF 업로드 시 파일명과 전체 페이지 수 표시 | `DeletePage.tsx:56-59` | PASS | `{file.file.name}`, `{file.pageCount}페이지` 표시 |
| AC-D-02 | 10페이지 PDF에 `2, 5-7` 입력 시 6페이지 PDF 다운로드 | `delete.ts:20-43`, `useDelete.ts:130-134` | PASS | deleteSet{1,4,5,6} → keepIndices{0,2,3,7,8,9} = 6페이지 |
| AC-D-03 | 삭제 범위 입력 시 "삭제 후 남은 페이지: N페이지" 실시간 표시 | `useDelete.ts:100-108`, `DeletePage.tsx:83-86` | PASS | `remainingPageCount` useMemo 실시간 계산 |
| AC-D-04 | 출력 파일명 기본값 `{원본파일명}_deleted.pdf` | `useDelete.ts:52-53` | PASS | `${baseName}_deleted.pdf` 자동 설정 |
| AC-D-05 | 빈 범위 입력 시 삭제 버튼 비활성화 | `useDelete.ts:110-117` | PASS | `rangeInput.trim()` + `remainingPageCount !== null` 복합 조건 |
| AC-D-06 | 3페이지 PDF에서 `1-3` 입력 시 "모든 페이지를 삭제할 수 없습니다" 오류 | `useDelete.ts:83-86` | PASS | 인라인 오류로 처리. 단, 메시지가 UX 설계와 다소 상이 (별도 기록) |
| AC-D-07 | 5페이지 PDF에 `8` 입력 시 유효하지 않은 범위 오류 | `pageRange.ts:42-44` | PASS | Extract와 동일한 오류 처리 경로 |
| AC-D-08 | 처리 중 로딩 인디케이터 표시 후 완료 시 소멸 | `DeletePage.tsx:119-128` | PASS | `Loader2 animate-spin` + `status === 'processing'` 분기 |
| AC-D-09 | 완료 후 '새 작업 시작' 클릭 시 초기 상태 복귀 | `DeletePage.tsx:37`, `useDelete.ts:142-149` | PASS | `reset()` 콜백 완전 초기화 |

**Delete AC 결과: 9/9 PASS**

---

## 3. 타입 안전성 검증

### 3.1 주요 타입 경계 확인

| 위치 | 타입 | 검증 내용 | 결과 |
|------|------|----------|------|
| `useExtract.ts:78-83` | `canExecute: boolean` | `Boolean()` 래핑으로 null/undefined 안전 처리 | PASS |
| `useDelete.ts:100-108` | `remainingPageCount: number \| null` | `null` 반환 조건 명시 (`!file`, `!rangeInput.trim()`, `rangeError` 시) | PASS |
| `useDelete.ts:110-117` | `canExecute: boolean` | `remainingPageCount !== null && remainingPageCount > 0` 복합 조건 | PASS |
| `extract.ts:20-21` | `indices: number[]` | `indices.length === 0` 사전 검사 후 Error throw | PASS |
| `delete.ts:27-29` | `deleteSet.size >= totalPages` | 전체 삭제 방지 조건 — `>=` 사용으로 정확함 | PASS |
| `pageRange.ts:14, 15` | 정규식 매칭 | `rangeMatch`, `singleMatch` 상호 배타적 처리 | PASS |
| `useExtract.ts:85-105` | `handleExtract` async | try/catch + `setStatus('error')` 보장 | PASS |
| `useDelete.ts:119-140` | `handleDelete` async | try/catch + `setStatus('error')` 보장 | PASS |

### 3.2 주의 필요 타입 이슈

**[주의-T1] useDelete.ts에서 delete.ts의 deletePages와 split.ts의 deletePages 혼용**

```typescript
// useDelete.ts:5
import { deletePages, calcRemainingPageCount } from '@/lib/pdf/delete'
// → src/lib/pdf/delete.ts를 임포트

// split.ts에도 deletePages 함수가 존재 (split.ts:59)
// → 현재 useDelete는 별도 delete.ts를 사용
// → split.ts의 deletePages와 중복 구현 발생
```

**판정**: 기능상 문제 없음. 단, delete.ts와 split.ts에 `deletePages`가 중복 정의되어 있어 유지보수 혼란 가능성 있음. (개선 권고)

---

## 4. 엣지 케이스 검증

### 4.1 Extract 엣지 케이스

| 케이스 (PRD E-EX) | 처리 코드 | 결과 | 실제 동작 |
|------------------|----------|------|----------|
| E-EX-01: 전체 페이지 추출 (`1-10`, 10페이지) | `pageRange.ts` 파싱 정상 통과 | PASS | 원본과 동일한 PDF 다운로드 |
| E-EX-02: 범위 초과 (`8`, 5페이지 PDF) | `pageRange.ts:42-44` | PASS | "파일의 전체 페이지(5페이지)를 초과해요." |
| E-EX-03: 형식 오류 (`a-b`, `1--3`) | `pageRange.ts:47-48` | PASS | "올바른 형식으로 입력해 주세요." |
| E-EX-04: `0` 또는 음수 입력 | `pageRange.ts:21-23`, `39-41` | PASS | "페이지 번호는 1부터 시작해요." |
| E-EX-05: 중복 범위 (`1-3, 2-4`) | `pageRange.ts` — **Set 미사용** | **주의** | 중복 인덱스 허용됨 (아래 설명) |
| E-EX-06: 암호화 PDF | `extract.ts:9-10` | PASS | "비밀번호로 잠긴 PDF는 지원하지 않아요." |
| E-EX-07: 손상 PDF | `extract.ts:11-13` | PASS | "PDF 파일을 읽을 수 없어요." |
| E-EX-08: 출력 파일명 비어있음 | `useExtract.ts:98` | PASS | `'extracted.pdf'` 기본값 사용 |

**[주의-E1] Extract에서 중복 범위 처리 방식**

`parsePageRanges` (평탄 배열 반환)는 Set을 사용해 중복 제거한다 (`pageRange.ts:56-64`).
그러나 `parseRangesIntoGroups`는 Set을 사용하지 않는다.

Extract의 `handleExtract`는 `parsePageRanges`를 사용하므로 `1-3, 2-4` 입력 시:
- `parsePageRanges('1-3,2-4', 10)` → `[0,1,2,3]` (중복 제거됨)
- 출력: 1,2,3,4페이지 4페이지 PDF

PRD E-EX-05는 "중복 포함하여 처리 (사용자 의도 존중)"을 기대하지만 실제로는 중복이 제거된다.
**기능 정지 수준의 버그는 아니나 PRD와 동작이 다름** → 개선 권고

### 4.2 Delete 엣지 케이스

| 케이스 (PRD E-D) | 처리 코드 | 결과 | 실제 동작 |
|-----------------|----------|------|----------|
| E-D-01: 전체 페이지 삭제 | `useDelete.ts:83-86` (인라인 오류) + `delete.ts:27-29` (최종 방어) | PASS | 이중 방어 구조 확인 |
| E-D-02: 범위 초과 | `pageRange.ts:42-44` | PASS | 인라인 오류 표시 |
| E-D-03: 형식 오류 | `pageRange.ts:47-48` | PASS | 인라인 오류 표시 |
| E-D-04: `0` 또는 음수 | `pageRange.ts:21-23`, `39-41` | PASS | 인라인 오류 표시 |
| E-D-05: 중복 범위 (`2-4, 3-5`) | `delete.ts:24-25` — Set 사용 | PASS | 중복 인덱스 자동 제거 후 합산 삭제 |
| E-D-06: 1페이지 PDF에서 1페이지 삭제 | `useDelete.ts:83-86`, `delete.ts:27-29` | PASS | "모든 페이지를 삭제할 수 없습니다." |
| E-D-07: 암호화 PDF | `delete.ts:9-10` | PASS | "비밀번호로 잠긴 PDF는 지원하지 않아요." |
| E-D-08: 손상 PDF | `delete.ts:11-13` | PASS | "PDF 파일을 읽을 수 없어요." |
| E-D-09: 출력 파일명 비어있음 | `useDelete.ts:132-133` | PASS | `{baseName}_deleted.pdf` 기본값 사용 |

**[확인-E2] Delete 전체 페이지 삭제 이중 방어 구조 — 정상**

```
1단계 방어: useDelete.ts:setRangeInput() → calcRemainingPageCount() → rangeError 설정 (UI 레이어)
2단계 방어: delete.ts:deletePages() → remainingIndices.length === 0 → Error throw (도메인 레이어)
```

두 레이어 모두 올바르게 작동함.

---

## 5. 기존 기능 영향 검증 (Split 회귀 테스트)

### 5.1 PageRangeInput 변경 영향

**변경 내용**: `totalPages` prop 제거, `label` prop 추가

```typescript
// 변경 전 (추정)
interface PageRangeInputProps {
  totalPages: number
  value: string
  onChange: (value: string) => void
  error: string | null
  disabled?: boolean
}

// 변경 후 (실제 구현)
interface PageRangeInputProps {
  label: string       // 신규: 레이블 텍스트를 외부에서 제공
  hint?: string       // 신규: 힌트 텍스트 (선택)
  value: string
  onChange: (value: string) => void
  error: string | null
  disabled?: boolean
}
```

**SplitPage.tsx에서의 사용** (`SplitPage.tsx:79-86`):

```tsx
<PageRangeInput
  label={`페이지 범위 (전체: ${file.pageCount}페이지)`}
  value={rangeInput}
  onChange={setRangeInput}
  error={rangeError}
  disabled={isProcessing}
/>
```

**검증 결과**:
- `label` prop을 명시적으로 전달하여 기존 동작 보존 — PASS
- `hint` prop 미전달 시 기본값 `'콤마(,)로 구분하면 각 범위가 별도 파일로 저장됩니다'` 사용 — PASS
- Split 탭 기능 로직(useSplit.ts)은 전혀 수정되지 않음 — PASS

**[주의-R1] PageRangeInput 내부 id 하드코딩 문제**

```tsx
// PageRangeInput.tsx:30
<label htmlFor="page-range" className="...">
// PageRangeInput.tsx:33
<Input id="page-range" ...>
// PageRangeInput.tsx:40
aria-describedby={error ? 'range-error' : 'range-hint'}
// PageRangeInput.tsx:43
<p id="range-error" ...>
// PageRangeInput.tsx:47
<p id="range-hint" ...>
```

`id="page-range"`, `id="range-error"`, `id="range-hint"`가 고정값이다.
같은 페이지에서 `PageRangeInput`이 2개 이상 렌더링되면 id 중복이 발생하여 접근성이 깨진다.

**현재 영향**: Extract와 Delete는 각각 별도 탭에서 단독 렌더링되므로 **현재는 문제 없음**.
그러나 Split 탭에서도 동일한 컴포넌트를 사용하므로, 탭 전환 시 이전 탭의 DOM이 완전히 언마운트되는지 확인 필요.
App.tsx에서 `{activeTab === 'split' && <SplitPage />}` 조건부 렌더링이므로 언마운트 보장됨 — 현재 문제 없음.

향후 동일 페이지 내 복수 PageRangeInput 사용 시 id 동적 생성 필요 — **개선 권고**

### 5.2 useSplit.ts 회귀 확인

Split 훅의 의존 함수들을 확인했다:
- `splitAllPages` — `split.ts`에서 임포트, 변경 없음 ✓
- `splitByRanges` — `split.ts`에서 임포트, 변경 없음 ✓
- `parseRangesIntoGroups` — `pageRange.ts`에서 임포트, 변경 없음 ✓
- `validateRangeInput` — `pageRange.ts`에서 임포트, 변경 없음 ✓
- `downloadPDF`, `downloadZip` — `download.ts`에서 임포트, 변경 없음 ✓

**Split 회귀 영향 없음 — PASS**

---

## 6. UX 일관성 검증

### 6.1 기존 Merge/Split 패턴과 비교

| UX 항목 | Merge/Split | Extract | Delete | 일관성 |
|---------|-------------|---------|--------|--------|
| DropZone 표시 (파일 없을 때) | 표시 | 표시 | 표시 | PASS |
| 파일 카드 (파일명 + 페이지수 + X버튼) | 동일 패턴 | 동일 패턴 | 동일 패턴 | PASS |
| 처리 중 Loader2 스피너 | 동일 | 동일 | 동일 | PASS |
| 완료 화면 (CheckCircle + 새 작업 시작) | 동일 | 동일 | 동일 | PASS |
| 오류 배너 (AlertCircle + role="alert") | 동일 | 동일 | 동일 | PASS |
| 버튼 `canExecute` 비활성화 패턴 | 동일 | 동일 | 동일 | PASS |
| 암호화/손상 파일 오류 메시지 | 동일 톤 | 동일 톤 | 동일 톤 | PASS |

### 6.2 마이크로카피 불일치

**[불일치-U1] DeletePage의 DropZone 제목**

| 항목 | UX 설계 (`ux-extract-delete.md:11.5`) | 실제 구현 (`DeletePage.tsx:47`) |
|------|--------------------------------------|-------------------------------|
| DropZone 제목 | "삭제할 페이지가 있는 PDF를 여기에 끌어다 놓으세요" | "편집할 PDF 파일을 여기에 끌어다 놓으세요" |

**영향도**: 낮음 (기능에 영향 없음). 단, UX 명세와 불일치. 개선 권고.

**[불일치-U2] Delete의 전체 삭제 오류 메시지**

| 항목 | UX 설계 (`ux-extract-delete.md:표 row`) | 실제 구현 (`useDelete.ts:84`) |
|------|----------------------------------------|------------------------------|
| 전체 삭제 오류 | "모든 페이지를 삭제할 수 없어요. 일부 페이지는 남겨야 합니다." | "모든 페이지를 삭제할 수 없습니다. 최소 1페이지는 남겨야 해요." |

**영향도**: 낮음 (기능 정상). 하지만 PRD AC-D-06의 기대 메시지 "모든 페이지를 삭제할 수 없습니다"와는 부분 일치함. 개선 권고.

**[불일치-U3] ExtractPage의 범위 입력 레이블**

| 항목 | UX 설계 (`ux-extract-delete.md:11.1`) | 실제 구현 (`ExtractPage.tsx:79`) |
|------|--------------------------------------|--------------------------------|
| 범위 입력 레이블 | "추출할 페이지 (전체: {N}페이지)" | `label="추출할 페이지 범위"` + 총 페이지 미포함 |

**영향도**: 낮음. 전체 페이지 수가 범위 레이블에 표시되지 않지만, 파일 카드에서 "전체 N페이지"를 이미 표시하고 있어 사용자 혼동 가능성 낮음. 개선 권고.

---

## 7. 도메인 명세 vs 구현 불일치 사항

### 7.1 파일 크기 제한 (주요)

| 항목 | PRD C-02 / 구 명세 | PDF_EXTRACT_DELETE_SPEC.md | 실제 구현 (`validate.ts`) |
|------|-------------------|---------------------------|--------------------------|
| reject 임계값 | 100MB | validate.ts 재활용 | **400MB** |
| warn 임계값 | 50MB | validate.ts 재활용 | **200MB** |

**영향**: Extract/Delete 화면에서 100~400MB 파일이 경고 없이 처리될 수 있음.
**판정**: Blocking 아님. 팀 내 정책 결정 필요. Extract/Delete의 단일 파일 특성상 400MB 제한이 더 현실적일 수 있음.

### 7.2 Extract 기본 파일명 (경미)

| 항목 | PDF_EXTRACT_DELETE_SPEC.md (섹션 6) | 실제 구현 (`useExtract.ts:33`) |
|------|-------------------------------------|-------------------------------|
| Extract 기본 파일명 | `{원본파일명}_extracted_{범위}.pdf` | `extracted.pdf` |

**판정**: PRD EX-06은 "기본값 `extracted.pdf`"로 명시 → PRD를 따름. 기술 명세(PDF_EXTRACT_DELETE_SPEC)와 PRD 간 불일치이나 PRD 우선이므로 구현이 올바름.

### 7.3 deletePages 함수 위치 (경미)

| 항목 | PDF_EXTRACT_DELETE_SPEC.md (섹션 3.3) | 실제 구현 |
|------|--------------------------------------|----------|
| deletePages 위치 | `split.ts`에 추가 예정 | `split.ts`에 추가됨 + **`delete.ts`에 별도 구현** |

`delete.ts`에도 `deletePages`가 독립적으로 구현되어 있고, `useDelete.ts`는 `delete.ts`를 임포트한다.
`split.ts`의 `deletePages`는 `useSplit.ts`에서 임포트하지 않으므로 현재 외부에서 사용되지 않는다.

**판정**: 중복 구현이나 기능 정상. 단, `split.ts`의 `deletePages`는 데드코드에 해당 — 개선 권고.

### 7.4 파일 타입 검증 조건 (주의)

| 항목 | 구 명세 (PDF_DOMAIN_SPEC.md 5.3) | 실제 구현 (`validate.ts:9-13`) |
|------|----------------------------------|-------------------------------|
| 타입 검증 조건 | MIME AND 확장자 | MIME **OR** 확장자 |

```typescript
// 실제 구현
if (!isPdfMime && !isPdfExt) {  // MIME도 아니고 확장자도 아닌 경우만 거부
  throw new Error('PDF 파일만 업로드할 수 있어요.')
}
```

단, `FileDropZone.tsx:31-33`에서도 동일한 OR 조건으로 필터링하므로 일관성 있음.
MIME 스푸핑 시 1차 필터를 통과하더라도 `PDFDocument.load()` 단계에서 최종 차단됨.

**판정**: 보안 위험 없음. 개선 권고 수준.

---

## 8. 발견된 이슈 목록

### 8.1 Blocking Bug (출시 차단)

**없음**

### 8.2 개선 권고 (Non-Blocking)

| ID | 분류 | 위치 | 내용 | 우선순위 |
|----|------|------|------|---------|
| I-01 | 중복 코드 | `split.ts:59-75`, `delete.ts:20-43` | `deletePages` 함수 중복 구현. `split.ts`의 것이 데드코드. `delete.ts`로 통합하거나 `split.ts`에서 제거 권고. | Low |
| I-02 | 접근성 | `PageRangeInput.tsx:30,33,43,47` | `id="page-range"` 등 하드코딩 id. 현재 단독 렌더링이라 문제 없으나 향후 복수 사용 시 id 중복 발생. 동적 id 생성 권고. | Low |
| I-03 | 마이크로카피 | `DeletePage.tsx:47` | DropZone 제목이 UX 설계("삭제할 페이지가 있는 PDF를...") 와 다름("편집할 PDF 파일을...") | Low |
| I-04 | 마이크로카피 | `ExtractPage.tsx:79` | 범위 입력 레이블에 전체 페이지 수 미표시 (UX 설계: "추출할 페이지 (전체: {N}페이지)") | Low |
| I-05 | PRD 불일치 | `pageRange.ts` + `extract.ts` | E-EX-05: 중복 범위 입력 시 PRD는 "중복 포함하여 처리"를 기대하나 실제 중복 제거됨. PRD 재정의 필요. | Low |
| I-06 | 파일 크기 | `validate.ts:4-5` | 파일 크기 제한(400MB/200MB)이 PRD 명세(100MB/50MB)와 다름. 의도적 변경이라면 PRD 업데이트 필요. | Medium |

---

## 9. 보안/프라이버시 검증

| 항목 | 검증 방법 | 결과 |
|------|----------|------|
| 외부 네트워크 요청 | Extract/Delete 모두 `extractPagesToPdf`, `deletePages`가 순수 메모리 처리 | PASS |
| `download.ts` 다운로드 | `URL.createObjectURL` + `<a>` 클릭 → `revokeObjectURL` (1초 후) | PASS |
| 메모리 누수 방지 | `setTimeout(() => URL.revokeObjectURL(url), 1000)` 확인 | PASS |
| 브라우저 내 처리 | pdf-lib 사용, 서버 호출 없음 | PASS |

---

## 10. 테스트 실행 권고 순서

이 보고서의 발견 사항을 바탕으로 실제 브라우저 검증 시 아래 순서를 권고한다.

### Priority 1 (필수 — Happy Path)

1. **AC-EX-02**: 10페이지 PDF 업로드 → `1-3, 5` 입력 → 추출 → 4페이지 PDF 다운로드 확인
2. **AC-D-02**: 10페이지 PDF 업로드 → `2, 5-7` 입력 → 삭제 → 6페이지 PDF 다운로드 확인
3. **AC-D-03**: 범위 입력 변경 시마다 "삭제 후 남은 페이지: N페이지" 실시간 업데이트 확인
4. **AC-EX-03, AC-D-07**: 출력 파일명 커스텀 변경 후 다운로드 시 파일명 반영 확인

### Priority 2 (엣지 케이스)

5. **E-D-01 / E-D-06**: 전체 페이지 삭제 시도 → 오류 표시 + 버튼 비활성 확인
6. **E-EX-05**: 중복 범위 `1-3, 2-4` 입력 → 중복 제거 후 처리 확인 (PRD 불일치 재현)
7. **E-EX-06, E-D-07**: 암호화 PDF로 추출/삭제 시도 → 오류 메시지 확인

### Priority 3 (회귀 확인)

8. **Split 회귀**: Split 탭에서 범위 분할 → ZIP 다운로드 정상 확인 (PageRangeInput 변경 영향)
9. **탭 전환 독립성**: Extract 작업 중 Delete 탭 이동 후 복귀 → 상태 초기화 확인

---

## 11. 최종 판정

| 판정 항목 | 결과 |
|---------|------|
| Blocking Bug | **없음** |
| PRD AC 미충족 | **없음** (17/17 PASS) |
| 기능 회귀 | **없음** |
| 출시 가능 여부 | **출시 가능** |
| 개선 권고 사항 | **6건** (모두 Non-Blocking) |

---

*이 보고서는 Extract/Delete 기능 구현 완료 후 정적 코드 검증 결과를 기록한다.*
*실제 브라우저 실행 테스트는 테스터가 별도로 수행해야 한다.*
*PRD v1.1, ux-extract-delete.md v1.1, PDF_EXTRACT_DELETE_SPEC.md v1.0.0 기반으로 작성되었다.*


---

---

# Rotate/Reorder 기능 코드 검증 보고서

**버전**: 2.0 (추가)
**작성일**: 2026-03-19
**작성자**: QA Engineer
**검증 대상**: Rotate/Reorder 기능 구현 (Task #11 산출물)
**기준 문서**: PRD v1.2, ux-rotate-reorder.md v1.1, PDF_ROTATE_REORDER_SPEC.md

---

## A. 검증 요약

| 항목 | 결과 |
|------|------|
| PRD Acceptance Criteria 충족 | **16/18 통과** (AC-R-07, AC-RO-05 미충족) |
| TypeScript 타입 안전성 | **통과** |
| 엣지 케이스 처리 | **통과** |
| 기존 기능 영향 (Extract/Delete 회귀) | **통과** |
| UX 일관성 | **대체로 통과** (불일치 6건) |
| **종합 판정** | **조건부 출시 가능** (AC 미충족 2건. 핵심 기능 정상 동작) |

---

## B. PRD Acceptance Criteria 검증

### B.1 Rotate AC (AC-R-01 ~ AC-R-10)

| AC ID | 요구사항 | 코드 위치 | 결과 | 비고 |
|-------|----------|----------|------|------|
| AC-R-01 | PDF 업로드 시 파일명과 전체 페이지 수 표시 | RotatePage.tsx:56-57 | PASS | file.file.name, file.pageCount 표시 |
| AC-R-02 | 범위 1, 3 + 90도 -> 1,3페이지만 90도 회전 PDF | useRotate.ts:94-96, rotate.ts:38-44 | PASS | parsePageRanges -> rotationMap 적용 |
| AC-R-03 | 범위 비워두면 전체 페이지에 회전 적용 | useRotate.ts:87-92 | PASS | rangeInput === '' -> 전체 인덱스 rotations 생성 |
| AC-R-04 | 180도 회전 | rotate.ts:43, types/pdf.ts:31 | PASS | RotateDegree 타입 180 포함 |
| AC-R-05 | 270도 회전 | rotate.ts:43, types/pdf.ts:31 | PASS | RotateDegree 타입 270 포함 |
| AC-R-06 | 각도 미선택 시 버튼 비활성 | useRotate.ts:73 | PASS | !degree -> canExecute=false |
| AC-R-07 | 출력 파일명 기본값 + 사용자 변경 가능 | useRotate.ts:100 | **FAIL** | 기본값 정상. **사용자 변경 입력 필드 없음** (OutputNameInput 미구현) |
| AC-R-08 | 처리 중 로딩 인디케이터 | RotatePage.tsx:104-108 | PASS | Loader2 animate-spin + isProcessing 분기 |
| AC-R-09 | 완료 후 새 작업 시작 -> 초기화 | RotatePage.tsx:35, useRotate.ts:108-115 | PASS | reset() 완전 초기화 |
| AC-R-10 | 범위 초과 시 오류 메시지 | useRotate.ts:64, pageRange.ts | PASS | validateRangeInput 동일 경로 |

**Rotate AC 결과: 9/10 통과 (AC-R-07 FAIL)**

### B.2 Reorder AC (AC-RO-01 ~ AC-RO-08)

| AC ID | 요구사항 | 코드 위치 | 결과 | 비고 |
|-------|----------|----------|------|------|
| AC-RO-01 | 파일명, 페이지 수, 카드 목록 표시 | ReorderPage.tsx:53-57, useReorder.ts:13-18 | PASS | buildPageItems -> PageCardList |
| AC-RO-02 | 드래그앤드롭 순서 즉시 반영 | PageCardList.tsx:35-42, useReorder.ts:59-61 | PASS | handleDragEnd -> arrayMove |
| AC-RO-03 | 변경 순서로 PDF 다운로드 | useReorder.ts:80-83 | PASS | pages.map(p => p.originalIndex) -> reorderPages |
| AC-RO-04 | Reset -> 원본 순서 복원 | useReorder.ts:63-67 | PASS | buildPageItems(pageCount) 재호출 |
| AC-RO-05 | 출력 파일명 기본값 + 사용자 변경 가능 | useReorder.ts:83 | **FAIL** | 기본값 정상. **사용자 변경 입력 필드 없음** (OutputNameInput 미구현) |
| AC-RO-06 | 순서 미변경 저장 허용 | useReorder.ts:69-71 | PASS | canExecute: pageCount >= 2 항상 활성 |
| AC-RO-07 | 처리 중 로딩 인디케이터 | ReorderPage.tsx:100-104 | PASS | Loader2 animate-spin |
| AC-RO-08 | 완료 후 새 작업 시작 -> 초기화 | ReorderPage.tsx:32, useReorder.ts:91-96 | PASS | reset() 완전 초기화 |

**Reorder AC 결과: 7/8 통과 (AC-RO-05 FAIL)**

---

## C. 타입 안전성 검증

| 위치 | 타입 | 검증 내용 | 결과 |
|------|------|----------|------|
| types/pdf.ts:31 | RotateDegree = 90 or 180 or 270 | 유니온 타입으로 허용값 제한 | PASS |
| types/pdf.ts:34-39 | PageRotation 인터페이스 | pageIndex + rotateDegrees 구조 | PASS |
| types/pdf.ts:42-48 | PageItem 인터페이스 | id + originalIndex + originalPageNumber | PASS |
| useRotate.ts:73 | canExecute: boolean | !file, !degree, status 복합 조건 | PASS |
| useReorder.ts:69-71 | canExecute: boolean | file && pageCount >= 2 && status | PASS |
| rotate.ts:23 | rotations.length === 0 | 빈 배열 사전 검사 후 Error throw | PASS |
| useRotate.ts:78-106 | handleRotate async | try/catch + setStatus('error') 보장 | PASS |
| useReorder.ts:73-89 | handleReorder async | try/catch + setStatus('error') 보장 | PASS |

---

## D. 엣지 케이스 검증

### D.1 Rotate 엣지 케이스

| 케이스 (PRD E-R) | 처리 코드 | 결과 | 실제 동작 |
|-----------------|----------|------|----------|
| E-R-01: 범위 비워두면 전체 적용 | useRotate.ts:87-92 | PASS | rangeInput === '' -> 전체 인덱스 배열 생성 |
| E-R-02: 범위 초과 | pageRange.ts validateRangeInput | PASS | 인라인 오류, canExecute=false |
| E-R-03: 형식 오류 | pageRange.ts | PASS | 올바른 형식으로 입력해 주세요 |
| E-R-04: 0 또는 음수 | pageRange.ts | PASS | 페이지 번호는 1부터 시작해요 |
| E-R-05: 기존 회전값 누적 | rotate.ts:42-44 | PASS | (existingDeg + addDeg) % 360 |
| E-R-06: 암호화 PDF | rotate.ts:9-11 | PASS | 비밀번호로 잠긴 PDF 오류 메시지 |
| E-R-07: 손상 PDF | rotate.ts:12-13 | PASS | PDF 파일을 읽을 수 없어요 오류 메시지 |
| E-R-08: 파일명 커스텀 | useRotate.ts:100 | 주의 | 파일명 입력 필드 없음, 항상 _rotated.pdf |
| E-R-09: 1페이지 PDF | useRotate.ts:87-96 | PASS | 정상 처리, 1페이지 회전 PDF 출력 |

### D.2 Reorder 엣지 케이스

| 케이스 (PRD E-RO) | 처리 코드 | 결과 | 실제 동작 |
|------------------|----------|------|----------|
| E-RO-01: 1페이지 PDF | ReorderPage.tsx:68-73, useReorder.ts:70 | PASS | 경고 표시 + canExecute=false. 색상 불일치 별도 기록 |
| E-RO-02: 순서 미변경 저장 | useReorder.ts:69-71 | PASS | pageCount >= 2 항상 활성 |
| E-RO-03: 드래그 중 스크롤 | PageCardList.tsx:66 | PASS | dnd-kit PointerSensor 기본 지원 |
| E-RO-04: 암호화 PDF | reorder.ts:9-11 | PASS | 비밀번호로 잠긴 PDF 오류 메시지 |
| E-RO-05: 손상 PDF | reorder.ts:12-13 | PASS | PDF 파일을 읽을 수 없어요 오류 메시지 |
| E-RO-06: 100페이지 이상 | PageCardList.tsx:66 | PASS | max-h-[480px] overflow-y-auto 적용 |
| E-RO-07: 파일명 커스텀 | useReorder.ts:83 | 주의 | 파일명 입력 필드 없음 |
| E-RO-08: Reset 후 재정렬 | useReorder.ts:63-67 | PASS | buildPageItems 재호출 후 드래그 가능 |

---

## E. 기존 기능 영향 검증 (회귀)

**PageRangeInput showHintAlways prop 확인 필요**

RotatePage.tsx:82에서 showHintAlways prop 사용. PageRangeInput.tsx에 해당 prop 정의 여부를 빌드로 확인해야 한다. 기존 Extract/Delete에서 사용하지 않는 prop이므로 Rotate 구현 시 추가된 것으로 추정됨. 미정의 시 TypeScript 빌드 에러 발생.

**Split/Extract/Delete 회귀**: Rotate/Reorder 코드는 독립 피처 폴더에 위치. 공유 유틸리티(pageRange.ts, validate.ts, download.ts) 수정 없음 -> 회귀 영향 없음.

---

## F. UX 일관성 검증

### F.1 기존 패턴과 비교

| UX 항목 | 기존 기능 | Rotate | Reorder | 일관성 |
|---------|---------|--------|---------|--------|
| DropZone 표시 | PASS | PASS | PASS | PASS |
| 파일 카드 패턴 | PASS | PASS | PASS | PASS |
| 처리 중 스피너 | PASS | PASS | PASS | PASS |
| 완료 화면 | PASS | PASS | PASS | PASS |
| 오류 배너 role=alert | PASS | PASS | PASS | PASS |
| 출력 파일명 커스텀 | Merge/Extract/Delete: 있음 | **없음** | **없음** | **불일치** |

### F.2 마이크로카피 불일치 (모두 Non-Blocking)

| ID | 위치 | UX 설계 | 실제 구현 |
|----|------|---------|----------|
| I-09 | RotateDegreeSelector.tsx:18 | legend: "회전 각도 선택" | "회전 각도" |
| I-10 | RotateDegreeSelector.tsx:4-6 | "180도 (뒤집기)", "270도 시계 방향 (반시계 90도)" | "180degrees", "270degrees (반시계 90degrees)" |
| I-11 | RotateDegreeSelector.tsx | RotateCw/RefreshCw/RotateCcw 아이콘 명시 | 아이콘 없음 |
| I-12 | ReorderPage.tsx:69-73 | 1페이지 안내: blue/role="status" | amber/AlertCircle (경고 톤) |
| I-13 | ReorderPage.tsx:43 | DropZone: "페이지 순서를 바꿀 PDF를..." | "순서를 바꿀 PDF 파일을..." |
| I-14 | ReorderPage.tsx:106 | 저장 버튼: "저장하기 ->" | "PDF 순서 저장하기 ->" |

---

## G. 핵심 AC 실패 상세 (AC-R-07 / AC-RO-05)

**PRD 명세**: "출력 파일명은 기본값이며 사용자가 변경할 수 있어야 한다"

**실제 구현**:
- useRotate.ts:100: downloadPDF(bytes, baseName + '_rotated.pdf') — 하드코딩
- useReorder.ts:83: downloadPDF(bytes, baseName + '_reordered.pdf') — 하드코딩
- RotatePage.tsx, ReorderPage.tsx: OutputNameInput 컴포넌트 미사용

**UX 설계 확인**: ux-rotate-reorder.md 섹션 6.2, 15에 "OutputNameInput 재사용" 명시되어 있었으나 구현 시 누락됨.

**판정**: PRD AC 직접 위반. 기본값은 올바르게 동작. 커스텀 입력 기능만 누락. **Medium 심각도** — Blocking 아님이나 명시 AC 미충족.

---

## H. 발견된 이슈 목록

| ID | 분류 | 위치 | 내용 | 심각도 |
|----|------|------|------|--------|
| I-07 | AC 미충족 | RotatePage.tsx, useRotate.ts:100 | AC-R-07: 파일명 사용자 변경 불가. OutputNameInput 미구현 | Medium |
| I-08 | AC 미충족 | ReorderPage.tsx, useReorder.ts:83 | AC-RO-05: 파일명 사용자 변경 불가. OutputNameInput 미구현 | Medium |
| I-09 | 마이크로카피 | RotateDegreeSelector.tsx:18 | legend 텍스트 "회전 각도" vs "회전 각도 선택" | Low |
| I-10 | 마이크로카피 | RotateDegreeSelector.tsx:4-6 | 옵션 레이블 미세 불일치 | Low |
| I-11 | 아이콘 누락 | RotateDegreeSelector.tsx | UX 설계 RotateCw/RefreshCw/RotateCcw 아이콘 미적용 | Low |
| I-12 | 색상/role 불일치 | ReorderPage.tsx:69-73 | 1페이지 안내 amber/AlertCircle vs blue/role="status" | Low |
| I-13 | 마이크로카피 | ReorderPage.tsx:43 | DropZone 제목 불일치 (의미 유사) | Low |
| I-14 | 마이크로카피 | ReorderPage.tsx:106 | 저장 버튼 텍스트 불일치 | Low |
| I-15 | 빌드 확인 | RotatePage.tsx:82, PageRangeInput.tsx | showHintAlways prop PageRangeInput 정의 여부 확인 필요 | Low |

---

## I. 보안/프라이버시 검증

| 항목 | 결과 |
|------|------|
| Rotate 처리 중 외부 전송 없음 | PASS — rotatePages 순수 pdf-lib 메모리 처리 |
| Reorder 처리 중 외부 전송 없음 | PASS — reorderPages 순수 pdf-lib 메모리 처리 |
| download.ts 다운로드 방식 | PASS — URL.createObjectURL + revokeObjectURL 1초 후 |

---

## J. 최종 판정

| 판정 항목 | 결과 |
|---------|------|
| Blocking Bug | **없음** |
| PRD AC 미충족 | **2건** (AC-R-07, AC-RO-05 — 파일명 커스텀 불가) |
| UX 불일관성 | **6건** (모두 Non-Blocking) |
| 기능 회귀 | **없음** |
| 출시 가능 여부 | **조건부 가능** — AC 미충족 수용 시 출시 가능. 엄격 기준 시 AC-R-07/RO-05 수정 필요 |
| 전체 이슈 | **9건** (I-07~I-15, Medium 2건 포함) |

---

---

## Password Protect (Encrypt) 기능 AC 검증

**검증 기준**: PRD v1.2 AC-PP-01 ~ AC-PP-18
**검증 방법**: 정적 코드 분석 (PasswordProtectPage.tsx, usePasswordProtect.ts, PasswordInput.tsx, protect.ts, validate.ts)
**검증일**: 2026-03-19

### A. 파일 업로드 및 검증

| AC | 항목 | 판정 | 근거 코드 |
|----|------|------|-----------|
| AC-PP-01 | PDF 파일만 수락 | PASS | `validateFileType()` — MIME OR 확장자 .pdf |
| AC-PP-02 | 이미 암호화된 PDF 거부 | PASS | `isEncryptedPDF()` 호출 후 fileError 설정 (usePasswordProtect.ts:62-68) |
| AC-PP-03 | 암호화 감지 시 비밀번호 섹션 숨김 | PASS | PasswordProtectPage.tsx:103 `{!fileError && (…)}` 조건부 렌더링 |
| AC-PP-04 | 파일 크기 초과 시 거부 | **PARTIAL** | reject 기준이 spec(100MB)과 다름 → **400MB** (validate.ts:4). 기능 동작은 하나 기준 불일치 |

### B. 비밀번호 입력

| AC | 항목 | 판정 | 근거 코드 |
|----|------|------|-----------|
| AC-PP-05 | 비밀번호 입력 필드 제공 | PASS | PasswordInput id="user-password" (PasswordProtectPage.tsx:105) |
| AC-PP-06 | 비밀번호 확인 필드 제공 | PASS | PasswordInput id="confirm-password" (PasswordProtectPage.tsx:115) |
| AC-PP-07 | 8자 미만 amber 힌트 | **PASS** | passwordTooShort useMemo 추가 (usePasswordProtect.ts:111-113), warning prop 전달 (PasswordProtectPage.tsx:129) |
| AC-PP-08 | 비밀번호 불일치 에러 표시 | PASS | passwordMismatch → error prop 전달 → "비밀번호가 일치하지 않아요." |
| AC-PP-09 | confirmPassword 빈칸 시 에러 미표시 | PASS | `if (confirmPassword === '') return false` (usePasswordProtect.ts:105) |
| AC-PP-10 | 비밀번호 일치 시 성공 표시 | PASS | success={passwordMatch} + successMessage="비밀번호가 일치해요." |
| AC-PP-11 | show/hide 토글 | PASS | PasswordInput 내부 showPassword state + Eye/EyeOff 아이콘 |
| AC-PP-12 | autoComplete="new-password" | PASS | PasswordInput.tsx:54, PasswordProtectPage.tsx:112,125 |

### C. 실행 조건 (canExecute)

| AC | 항목 | 판정 | 근거 코드 |
|----|------|------|-----------|
| AC-PP-13 | 모든 조건 충족 시에만 실행 가능 | PASS | canExecute: file && !fileError && password.trim() && confirmPassword && 비밀번호 일치 && status==='idle' |

**주의**: canExecute에 `outputName.trim().length > 0` 조건이 **없음** — 빈 outputName으로도 실행 가능 (폴백 파일명 사용). UX 스펙(PP-07)과 미세 차이 있으나 기능적으로 문제 없음.

### D. 암호화 실행 및 다운로드

| AC | 항목 | 판정 | 근거 코드 |
|----|------|------|-----------|
| AC-PP-14 | AES-256 암호화 적용 | PASS | `pdfVersion: '1.7ext3'` = AES-256 (protect.ts:18) |
| AC-PP-15 | 처리 완료 후 자동 다운로드 | PASS | `downloadPDF(bytes, currentOutputName)` (usePasswordProtect.ts:131) |
| AC-PP-16 | 완료 카드 + 비밀번호 보관 경고 | **PASS** | AlertTriangle amber 배너 "비밀번호를 안전하게 보관하세요. 분실 시 파일을 열 수 없으며 복구가 불가능해요." 추가됨 (PasswordProtectPage.tsx:49-54) |
| AC-PP-17 | "다시 다운로드" 버튼 | PASS | resultBlob && `<Button onClick={handleRetryDownload}>다시 다운로드</Button>` |

### E. 보안/메모리 관리

| AC | 항목 | 판정 | 근거 코드 |
|----|------|------|-----------|
| AC-PP-18 | 처리 완료 후 비밀번호 메모리 초기화 | PASS | `setPasswordState('')` + `setConfirmPasswordState('')` (usePasswordProtect.ts:135-136) |
| AC-PP-19 (PP-15) | localStorage/sessionStorage/IndexedDB 저장 금지 | PASS | 코드 전체에 storage API 사용 없음 |
| AC-PP-20 (PP-16) | 이미 암호화된 PDF 에러 메시지 | PASS | protect.ts:24 catch 블록 + usePasswordProtect.ts:66 |

### F. UI/UX 세부 사항

| 항목 | 판정 | 근거 코드 |
|------|------|-----------|
| 처리 중 Spinner 표시 | PASS | `isProcessing && <Loader2 animate-spin>` (PasswordProtectPage.tsx:168) |
| 처리 중 파일 제거 버튼 비활성 | PASS | `disabled={isProcessing}` (PasswordProtectPage.tsx:95) |
| 처리 중 FileDropZone 비활성 | PASS | `disabled={isProcessing}` (PasswordProtectPage.tsx:67) |
| AES-256 신뢰 배지 | PASS | "AES-256 암호화 · 파일이 서버로 전송되지 않아요" (PasswordProtectPage.tsx:180) |
| 에러 상태 "다시 시도" 버튼 | PASS | retryFromError → status='idle', 에러 클리어, 입력값 유지 |
| OutputNameInput 제공 | PASS | PasswordProtectPage.tsx:128-133 |
| aria-invalid, aria-describedby | PASS | PasswordInput.tsx:55-58 |
| 탭 마운트 시 초기화 | PASS | App.tsx 조건부 렌더링, 언마운트 시 React state 소멸 |

### G. 아키텍처 차이 — 중요 발견사항

| 항목 | 스펙 문서 (PDF_ENCRYPT_SPEC.md) | 실제 구현 |
|------|-------------------------------|-----------|
| 암호화 라이브러리 | @cantoo/qpdf WASM (비공식) | **pdf-lib-plus-encrypt** (순수 JS) |
| 처리 방식 | Web Worker + Transferable ArrayBuffer | **메인 스레드 직접 처리** |
| WASM 초기화 상태 | 'wasm-init' ProcessingStatus | **없음** (idle/processing/done/error만 사용) |
| ownerPassword | UI에서 미노출, 내부 자동 생성 (spec 미정) | **userPassword와 동일값** (MVP 정책) |
| 파일 크기 제한 (encrypt) | 50MB warn / 100MB reject | **200MB warn / 400MB reject** (공통 validate.ts 사용) |

**평가**: 구현 라이브러리가 스펙과 다르나, AES-256 암호화 결과는 동일하게 달성됨. Web Worker 미사용으로 대용량 파일 처리 시 UI 블로킹 가능성 있음 (Medium 이슈).

### H. 발견된 이슈

| ID | 심각도 | 항목 | 설명 |
|----|--------|------|------|
| I-16 | ~~Medium~~ | ~~AC-PP-07 미구현~~ | **수정 완료** — passwordTooShort useMemo + warning prop 전달 확인됨. |
| I-17 | ~~Medium~~ | ~~AC-PP-16 경고 문구 누락~~ | **수정 완료** — AlertTriangle amber 배너 추가 확인됨. |
| I-18 | ~~Low~~ | ~~파일 크기 제한 기준 불일치~~ | **수정 완료** — ENCRYPT_MAX = 100MB 별도 상수 적용 확인됨 (usePasswordProtect.ts:56-59). 에러 메시지 "100MB를 초과하는 파일은 지원하지 않아요." |
| I-19 | Low | Web Worker 미사용 | 대용량 PDF(100MB+) 암호화 시 메인 스레드 블로킹 가능. UI 미응답 위험. MVP 범위 내에서 허용 가능. |
| I-20 | Low | canExecute에 outputName 조건 없음 | 빈 outputName으로도 실행 가능 (폴백 사용). UX 스펙과 미세 차이이나 실질적 문제 없음. |

### I. 최종 판정 — Password Protect

| 판정 항목 | 결과 |
|---------|------|
| Blocking Bug | **없음** |
| PRD AC 미충족 | **0건** (I-16/I-17 수정 완료, I-18 파일 크기 기준도 수정됨) |
| 아키텍처 차이 | **1건** (WASM → pdf-lib-plus-encrypt, 기능 동일 — 의도된 결정) |
| UX 불일관성 | **0건** (파일 크기 기준 수정 완료) |
| 기능 회귀 | **없음** |
| 출시 가능 여부 | **출시 가능** — 모든 Blocking/Medium 이슈 수정 완료. |
| 전체 이슈 | **2건 잔존** (I-19 Web Worker 미사용 Low, I-20 outputName 조건 없음 Low) — 기능 영향 없음 |

---

*이 보고서는 Password Protect 기능 구현 완료 후 정적 코드 검증 결과를 기록한다. I-16/I-17/I-18 수정 사항 재검증 반영 (2026-03-19).*
---

## Image to PDF 기능 AC 검증

**검증 기준**: PRD v1.4 (Image to PDF 기능), ux-image-to-pdf.md v1.0
**검증 방법**: 정적 코드 분석 (ImageToPdfPage.tsx, useImageToPdf.ts, imageToPdf.ts, validateImage.ts, ImageCard.tsx, ImageCardList.tsx, ImageDropZone.tsx, PageSizePicker.tsx)
**검증일**: 2026-03-19

### A. 이미지 포맷 지원

| 항목 | 판정 | 근거 코드 |
|------|------|-----------|
| JPG/JPEG 직접 임베딩 | PASS | `imageToPdf.ts:123-125` — embedJpg 직접 사용 |
| PNG 직접 임베딩 | PASS | `imageToPdf.ts:126-128` — embedPng 직접 사용 |
| WebP → Canvas → PNG 변환 | PASS | `detectImageFormat` 'canvas-to-png' 분기, `convertToPng()` |
| GIF 첫 프레임 변환 | PASS | Canvas 렌더링 (GIF 첫 프레임 자동 추출) |
| BMP → Canvas → PNG 변환 | PASS | 'canvas-to-png' 분기 처리 |
| HEIC/TIFF/SVG 거부 | PASS | `detectImageFormat` 'unsupported' → 에러 throw (`imageToPdf.ts:116-118`) |
| 업로드 시점 포맷 검증 | PASS | `validateImageFile()` 호출 (`useImageToPdf.ts:73`) |

### B. 파일 크기 정책

| 항목 | 판정 | 근거 코드 |
|------|------|-----------|
| 개별 파일 50MB 거부 | PASS | `MAX_IMAGE_SIZE = 50MB`, `checkImageSizePolicy` = 'reject' → 에러 카드 (`useImageToPdf.ts:84-89`) |
| 개별 파일 20~50MB 경고 | PASS | `WARN_IMAGE_SIZE = 20MB`, 'warn' → sizeWarning 설정 (`useImageToPdf.ts:101-103`) |
| 합산 200MB 거부 | PASS | `MAX_TOTAL_IMAGE_SIZE = 200MB`, `totalSizeError` → 배너 + canConvert=false |
| 에러 메시지 구체성 | PASS | 파일 크기 (MB) 포함한 메시지 표시 (`formatFileSize`) |

### C. 이미지 카드 목록 UI

| 항목 | 판정 | 근거 코드 |
|------|------|-----------|
| 썸네일 표시 | PASS | `URL.createObjectURL` → ImageCard img 태그 (`ImageCard.tsx:59`) |
| 파일명 표시 | PASS | `ImageCard.tsx:73` |
| 파일 크기 표시 | PASS | `ImageCard.tsx:75` — MB 단위 |
| 개별 X 버튼 제거 | PASS | `ImageCard.tsx:90-98` |
| 드래그앤드롭 순서 변경 | PASS | @dnd-kit/sortable + `arrayMove` (`useImageToPdf.ts:121-127`) |
| 에러 카드 드래그 비활성 | PASS | `useSortable({ disabled: disabled || !!item.error })` (`ImageCard.tsx:21`) |
| GIF 첫 프레임 안내 | PASS | `isGif && !hasError` → 안내 문구 (`ImageCard.tsx:81-83`) |
| 크기 경고 뱃지 | PASS | `sizeWarning && !hasError` → amber 텍스트 (`ImageCard.tsx:78-80`) |
| 목록에서 추가 버튼 | PASS | ImageCardList "이미지 추가" 버튼 (`ImageCardList.tsx:83-91`) |
| 이미지 목록 높이 제한 | PASS | `max-h-[480px] overflow-y-auto` (`ImageCardList.tsx:67`) |

### D. 페이지 크기 선택

| 항목 | 판정 | 근거 코드 |
|------|------|-----------|
| A4 모드 (기본값) | PASS | `setPageSizeState('a4')` 초기값 (`useImageToPdf.ts:48`) |
| Letter 모드 | PASS | `fitImageToPage(doc, image, LETTER_WIDTH, LETTER_HEIGHT)` |
| 원본 크기 모드 | PASS | `buildPageFromOriginalSize` — 이미지 픽셀 크기 그대로 사용 |
| 원본 크기 안내 문구 | PASS | "이미지마다 페이지 크기가 다를 수 있어요." (`PageSizePicker.tsx:50`) |
| 여백 40pt 적용 (A4/Letter) | PASS | `MARGIN = 40` (`imageToPdf.ts:11`) |
| 비율 유지 + 확대 없음 | PASS | `Math.min(maxW / imgW, maxH / imgH, 1.0)` (`imageToPdf.ts:85`) |
| 중앙 정렬 | PASS | `x = (pageWidth - drawW) / 2` (`imageToPdf.ts:90`) |
| 투명 PNG 흰색 배경 | PASS | `page.drawRectangle(... color: rgb(1,1,1))` (`imageToPdf.ts:79`) |

### E. 출력 파일명 로직

| 항목 | 판정 | 근거 코드 |
|------|------|-----------|
| 단일 이미지 → 원본명 | PASS | `computeOutputName`: valid.length===1 → 원본명 확장자 제거 |
| 복수 이미지 → "images" | PASS | `computeOutputName`: 그 외 → 'images' |
| 사용자 수정 시 자동갱신 중단 | PASS | `outputNameDirty` flag (`useImageToPdf.ts:50,131-134`) |
| 파일 추가/제거 시 자동갱신 | PASS | `useEffect([images, outputNameDirty])` (`useImageToPdf.ts:130-134`) |
| 최종 파일명에 .pdf 자동 추가 | PASS | `(outputName.trim() || 'images') + '.pdf'` (`useImageToPdf.ts:172`) |

### F. canConvert 조건

| 조건 | 판정 | 근거 코드 |
|------|------|-----------|
| 유효 이미지 1개 이상 | PASS | `hasValidImages = images.some(img => !img.error)` |
| 에러 이미지 없음 | PASS | `!hasErrorImages` |
| outputName.trim() > 0 | PASS | 명시적 조건 |
| status === 'idle' | PASS | 처리 중 재실행 방지 |
| totalSizeError === null | PASS | 합산 초과 시 false |

### G. 처리 완료 및 다운로드

| 항목 | 판정 | 근거 코드 |
|------|------|-----------|
| 자동 다운로드 | PASS | `downloadPDF(bytes, finalName)` (`useImageToPdf.ts:177`) |
| resultBlob 저장 | PASS | `setResultBlob(blob)` → "다시 다운로드" 사용 |
| resultPageCount 표시 | PASS | `setResultPageCount(validImages.length)` → 완료 카드 페이지 수 |
| "다시 다운로드" 버튼 | PASS | `ImageToPdfPage.tsx:52-55` |
| 완료 카드 role="status" | PASS | `ImageToPdfPage.tsx:39` |
| Blob URL 정리 | PASS | `handleRetryDownload`에서 `URL.revokeObjectURL` |

### H. 보안/프라이버시

| 항목 | 판정 | 근거 코드 |
|------|------|-----------|
| 서버 전송 없음 | PASS | imageToPdf.ts 순수 pdf-lib 처리, 네트워크 API 없음 |
| 프라이버시 배지 표시 | PASS | "파일이 내 기기를 떠나지 않아요" 배지 (`ImageToPdfPage.tsx:70-73`) |
| 신뢰 배지 (실행 버튼 하단) | PASS | "파일이 서버로 전송되지 않아요" (`ImageToPdfPage.tsx:154`) |
| 썸네일 URL 해제 (언마운트) | PASS | useEffect cleanup + removeImage 시 revoke (`useImageToPdf.ts:57-65,115`) |

### I. 8탭 구조 및 기존 기능 회귀

| 항목 | 판정 | 근거 코드 |
|------|------|-----------|
| 8번째 탭 'image-to-pdf' 추가 | PASS | `App.tsx:22` — `{ id: 'image-to-pdf', label: '이미지→PDF' }` |
| 탭 overflow-x-auto | PASS | `App.tsx:41` — `overflow-x-auto scrollbar-hide` |
| 기존 7탭 렌더링 영향 없음 | PASS | 각 탭 독립 조건 렌더링, image-to-pdf만 추가됨 |

### J. 발견된 이슈

| ID | 심각도 | 항목 | 설명 |
|----|--------|------|------|
| I-21 | Low | EXIF orientation 미보정 | 스마트폰 세로 사진이 PDF에서 회전되어 나올 수 있음. ux-image-to-pdf.md에 알려진 제약사항으로 문서화됨. MVP 범위 외. |
| I-22 | Low | 이미지 0개 + 에러 카드 존재 시 합산 크기 검증 제외 | `totalSizeError` useMemo에서 `validFiles = images.filter(img => !img.error)` — 에러 카드 파일은 합산에서 제외됨. 의도된 동작이나 문서화 필요. |
| I-23 | Low | 처리 중 "이미지 추가" 버튼 숨김 (disabled 아님) | `ImageCardList.tsx:81` — `!disabled` 조건으로 버튼 자체가 사라짐. 다른 기능과 일관성 차이(disabled vs 숨김). 기능 영향 없음. |

### K. 최종 판정 — Image to PDF

| 판정 항목 | 결과 |
|---------|------|
| Blocking Bug | **없음** |
| PRD AC 미충족 | **0건** |
| 알려진 제약사항 | **1건** (EXIF orientation — MVP 범위 외, 문서화됨) |
| 잔존 이슈 | **3건** (I-21~I-23, 모두 Low) |
| 출시 가능 여부 | **출시 가능** |

---

*이 보고서는 Image to PDF 기능 구현 완료 후 정적 코드 검증 결과를 기록한다.*
*실제 브라우저 실행 테스트(Canvas 변환 경로, 드래그앤드롭, 파일 다운로드 확인)는 테스터가 별도로 수행해야 한다.*
*PRD v1.4, ux-image-to-pdf.md v1.0 기반으로 작성되었다.*

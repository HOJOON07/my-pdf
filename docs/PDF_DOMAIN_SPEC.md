# PDF 도메인 기술 명세

> 버전: 1.0.0
> 작성일: 2026-03-18
> 작성자: PDF Domain Specialist
> 대상: Frontend Architect, Frontend Implementation, QA Engineer

---

## 1. 개요

이 문서는 브라우저 기반 PDF Merge / Split MVP의 PDF 처리 로직을 정의한다.
모든 처리는 클라이언트 브라우저 내에서만 수행되며, 서버 업로드는 없다.
PDF 처리 라이브러리는 **pdf-lib** (`^1.17.1`)를 사용한다.

---

## 2. PDF 병합 (Merge) 로직

### 2.1 기본 흐름

```
[File[] 입력] → [ArrayBuffer 변환] → [PDFDocument.load()] → [copyPages()] → [저장] → [Blob 다운로드]
```

### 2.2 구현 방식

```typescript
import { PDFDocument } from 'pdf-lib';

async function mergePDFs(files: File[]): Promise<Uint8Array> {
  const mergedDoc = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const srcDoc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: false, // 암호화 파일 시 예외 발생
    });
    const copiedPages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
    copiedPages.forEach((page) => mergedDoc.addPage(page));
  }

  return mergedDoc.save();
}
```

### 2.3 주의사항

- `copyPages()`는 소스 문서의 폰트, 이미지, 어노테이션을 함께 복사한다.
- 병합 순서는 `files` 배열의 순서와 동일하다. UI에서 드래그 재정렬 기능이 있다면 배열 순서가 최종 순서다.
- 각 파일을 `ArrayBuffer`로 변환하는 비용이 있으므로 파일별 순차 처리 후 메모리 해제를 고려한다.
- `mergedDoc.save()`는 `Uint8Array`를 반환한다. 다운로드 시 `Blob`으로 변환해야 한다.

---

## 3. PDF 분할 (Split) 로직

### 3.1 기본 흐름

```
[File 입력] → [ArrayBuffer 변환] → [PDFDocument.load()] → [페이지 범위 파싱] → [새 PDFDocument 생성 + copyPages()] → [저장] → [Blob 다운로드]
```

### 3.2 구현 방식 (단일 범위 추출)

```typescript
import { PDFDocument } from 'pdf-lib';

async function splitPDF(file: File, pageIndices: number[]): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer);

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
  copiedPages.forEach((page) => newDoc.addPage(page));

  return newDoc.save();
}
```

- `pageIndices`는 0-based 인덱스 배열이다. (페이지 1 = 인덱스 0)
- 여러 범위를 분리 파일로 추출하는 경우, 범위별로 위 함수를 반복 호출한다.

### 3.3 분할 모드

MVP는 다음 두 가지 분할 모드를 지원한다.

| 모드 | 설명 | 출력 |
|------|------|------|
| 범위 추출 | 특정 페이지 범위를 하나의 파일로 추출 | 단일 PDF |
| 전체 분리 | 모든 페이지를 개별 파일로 분리 | N개의 PDF |

---

## 4. 페이지 범위 입력 규칙

### 4.1 입력 형식

| 형식 | 예시 | 의미 |
|------|------|------|
| 단일 페이지 | `3` | 3페이지만 |
| 범위 | `1-5` | 1~5페이지 |
| 복합 (콤마 구분) | `1-3, 5, 7-10` | 1~3, 5, 7~10페이지 |
| 혼합 | `2, 4-6, 9` | 2, 4~6, 9페이지 |

### 4.2 파싱 로직

```typescript
function parsePageRanges(input: string, totalPages: number): number[] {
  const indices: number[] = [];
  const parts = input.split(',').map((s) => s.trim());

  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      const page = parseInt(part, 10);
      if (page < 1 || page > totalPages) throw new Error(`페이지 ${page}는 범위를 벗어납니다.`);
      indices.push(page - 1);
    } else if (/^\d+-\d+$/.test(part)) {
      const [start, end] = part.split('-').map(Number);
      if (start < 1 || end > totalPages || start > end) {
        throw new Error(`범위 ${part}가 유효하지 않습니다.`);
      }
      for (let i = start; i <= end; i++) indices.push(i - 1);
    } else {
      throw new Error(`입력 형식이 올바르지 않습니다: "${part}"`);
    }
  }

  // 중복 제거 후 정렬
  return [...new Set(indices)].sort((a, b) => a - b);
}
```

### 4.3 유효하지 않은 입력 예시와 처리

| 잘못된 입력 | 오류 유형 | 처리 방식 |
|------------|----------|----------|
| `0` | 0페이지(존재 불가) | 오류 메시지: "페이지는 1부터 시작합니다." |
| `5-3` | 역순 범위 | 오류 메시지: "시작 페이지가 끝 페이지보다 큽니다." |
| `99` (총 10페이지 파일) | 범위 초과 | 오류 메시지: "파일에는 10페이지만 있습니다." |
| `1-3-5` | 형식 오류 | 오류 메시지: "입력 형식이 올바르지 않습니다." |
| `` (빈 입력) | 빈 입력 | 오류 메시지: "페이지 범위를 입력하세요." |
| `abc` | 비숫자 | 오류 메시지: "숫자와 하이픈(-)만 입력 가능합니다." |
| `1,1,2` | 중복 (허용) | 중복 제거 후 처리, 경고 없음 |

---

## 5. 예외 케이스 처리

### 5.1 암호화(비밀번호 보호) 파일

pdf-lib의 `PDFDocument.load()` 는 비밀번호가 필요한 암호화 파일에 대해 예외를 던진다.

```typescript
try {
  const doc = await PDFDocument.load(arrayBuffer);
} catch (e) {
  if (e instanceof Error && e.message.includes('encrypted')) {
    // 사용자에게 명확한 피드백 제공
    throw new Error('암호화된 PDF 파일은 지원하지 않습니다. 비밀번호를 해제한 후 다시 시도하세요.');
  }
  throw e;
}
```

- MVP 범위에서는 비밀번호 해제 기능을 제공하지 않는다.
- 오류 메시지로 사용자에게 명확히 안내한다.

### 5.2 손상(Corrupted) 파일

손상된 PDF는 `PDFDocument.load()` 단계에서 파싱 오류가 발생한다.

```typescript
try {
  const doc = await PDFDocument.load(arrayBuffer);
} catch (e) {
  throw new Error('PDF 파일을 읽을 수 없습니다. 파일이 손상되었거나 올바른 PDF 형식이 아닙니다.');
}
```

### 5.3 PDF가 아닌 파일

파일 확장자 `.pdf` 및 MIME 타입 `application/pdf` 검사는 업로드 단계에서 수행한다.
그러나 MIME 타입 스푸핑 가능성이 있으므로 `PDFDocument.load()` 오류를 반드시 catch해야 한다.

```typescript
// 업로드 단계 검사
function validateFileType(file: File): void {
  if (!file.name.endsWith('.pdf') || file.type !== 'application/pdf') {
    throw new Error('PDF 파일만 업로드할 수 있습니다.');
  }
}
```

### 5.4 0페이지 PDF

이론상 페이지 수가 0인 PDF가 존재할 수 있다. 로드 후 명시적으로 확인한다.

```typescript
const doc = await PDFDocument.load(arrayBuffer);
if (doc.getPageCount() === 0) {
  throw new Error('페이지가 없는 PDF 파일은 처리할 수 없습니다.');
}
```

### 5.5 예외 처리 요약

| 케이스 | 발생 시점 | 처리 방식 |
|--------|----------|----------|
| 암호화 파일 | load() | 오류 메시지 + 처리 중단 |
| 손상 파일 | load() | 오류 메시지 + 처리 중단 |
| 잘못된 MIME | 업로드 | 파일 거부 |
| 0페이지 | load() 후 | 오류 메시지 + 처리 중단 |
| 범위 초과 | 파싱 시 | 인라인 오류 표시 |
| 빈 파일 목록 | 실행 전 | 버튼 비활성화 |

---

## 6. 브라우저 메모리 제약 및 성능

### 6.1 메모리 사용 구조

PDF 처리 시 브라우저 힙 메모리에 다음이 동시에 올라간다.

```
원본 파일 ArrayBuffer + pdf-lib 파싱 객체 + 새 PDFDocument 객체 + save() 결과 Uint8Array
```

실제 메모리 사용량은 원본 파일 크기의 **2~4배**로 추정한다.
예: 50MB PDF 처리 시 약 100~200MB 힙 메모리 사용.

### 6.2 파일 크기 제한 정책

| 파일 크기 | 정책 |
|----------|------|
| 0 ~ 50MB | 즉시 처리, 경고 없음 |
| 50MB ~ 100MB | 처리 전 경고 표시: "파일이 큽니다. 처리에 시간이 걸릴 수 있습니다." |
| 100MB 초과 | 처리 거부: "100MB 이상 파일은 지원하지 않습니다." |

병합의 경우 **전체 파일 합산 크기**를 기준으로 한다.

```typescript
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const WARN_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function checkFileSizePolicy(files: File[]): 'ok' | 'warn' | 'reject' {
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > MAX_FILE_SIZE) return 'reject';
  if (totalSize > WARN_FILE_SIZE) return 'warn';
  return 'ok';
}
```

### 6.3 처리 방식

- pdf-lib는 동기적 계산 작업이 메인 스레드를 블로킹할 수 있다.
- 대용량 처리 시 UI 응답성 저하를 막기 위해 처리 중 **로딩 인디케이터**를 반드시 표시한다.
- 처리 완료 후 사용 완료된 `ArrayBuffer` 참조를 해제해 GC를 유도한다.
- Web Worker 분리는 MVP 범위 외로, 필요 시 이후 단계에서 고려한다.

### 6.4 브라우저 호환성

| 환경 | 지원 여부 | 비고 |
|------|----------|------|
| Chrome 90+ | 지원 | 권장 |
| Firefox 88+ | 지원 | |
| Safari 14+ | 지원 | |
| Edge 90+ | 지원 | |
| Mobile Chrome/Safari | 부분 지원 | 100MB 제한 더 엄격히 적용 권장 |

---

## 7. UX에 반영해야 할 기술적 제약

| 제약 | UX 반영 방안 |
|------|------------|
| 처리 중 메인 스레드 블로킹 | 처리 시작 즉시 로딩 스피너 + 버튼 비활성화 |
| 암호화 파일 미지원 | 업로드 단계에서 암호화 감지 불가 → 처리 시 오류 메시지 표시 |
| 100MB 파일 크기 제한 | 업로드 단계에서 파일 크기 즉시 검사 후 거부 |
| 파일 순서가 병합 결과에 영향 | 파일 목록에 순서 번호 표시 + 드래그 재정렬 UI 제공 |
| 다운로드가 유일한 저장 방법 | 처리 완료 즉시 자동 다운로드 또는 다운로드 버튼 강조 |
| 페이지 범위 오류는 즉시 표시 | 입력 필드 옆 인라인 오류 메시지 (submit 전에 실시간 검증) |

---

## 8. 구현 주의사항 (개발팀 전달)

### 8.1 pdf-lib 설치 및 임포트

```bash
npm install pdf-lib
```

```typescript
import { PDFDocument } from 'pdf-lib';
// 전체 라이브러리 임포트 시 번들 크기 약 800KB(gzip: ~250KB)
// Vite tree-shaking 적용 시 일부 최적화 가능
```

### 8.2 다운로드 처리

```typescript
function downloadPDF(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // 메모리 누수 방지: URL 해제
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
```

### 8.3 비동기 처리 패턴

```typescript
// 병합 실행 예시
async function handleMerge(files: File[]): Promise<void> {
  setLoading(true);
  try {
    const policy = checkFileSizePolicy(files);
    if (policy === 'reject') throw new Error('100MB 이상 파일은 지원하지 않습니다.');
    if (policy === 'warn') {
      // 사용자 확인 다이얼로그 표시
    }
    const bytes = await mergePDFs(files);
    downloadPDF(bytes, 'merged.pdf');
  } catch (e) {
    setError(e instanceof Error ? e.message : '처리 중 오류가 발생했습니다.');
  } finally {
    setLoading(false);
  }
}
```

### 8.4 파일명 생성 규칙

| 기능 | 파일명 규칙 | 예시 |
|------|-----------|------|
| 병합 | `merged.pdf` | `merged.pdf` |
| 범위 추출 | `{원본파일명}_pages_{범위}.pdf` | `report_pages_1-5.pdf` |
| 전체 분리 | `{원본파일명}_page_{번호}.pdf` | `report_page_3.pdf` |

### 8.5 절대 하지 말아야 할 것

- `PDFDocument.load()` 결과를 try-catch 없이 사용하지 말 것.
- 파일 크기 확인 없이 `file.arrayBuffer()` 바로 호출하지 말 것 (대용량 파일에서 메모리 과부하).
- `URL.createObjectURL()` 후 `revokeObjectURL()` 누락하지 말 것 (메모리 누수).
- 페이지 인덱스를 1-based로 pdf-lib에 전달하지 말 것 (0-based 필수).

---

## 9. 의존성 버전

| 라이브러리 | 권장 버전 | 용도 |
|-----------|---------|------|
| pdf-lib | ^1.17.1 | PDF 생성, 병합, 분할 |

> pdf.js는 PDF 렌더링(미리보기)에 사용 가능하나 MVP 범위에서는 필수 아님.
> 미리보기 기능이 추가될 경우 `pdfjs-dist` 추가 검토.

# PDF 암호화(Password Protect) 기술 조사 보고서

> 버전: 1.0.0
> 작성일: 2026-03-19
> 작성자: PDF Domain Specialist
> 대상: Frontend Architect, Frontend Implementation, QA Engineer

---

## 1. 핵심 전제: pdf-lib 암호화 미지원

pdf-lib ^1.17.1은 **PDF 암호화 생성을 지원하지 않는다**.
- `PDFDocument.save()` 옵션에 암호화 관련 파라미터가 없다.
- 암호화 PDF 로드 시 예외를 던지며, 암호화 해제 기능도 없다.
- pdf-lib GitHub 이슈 #394(2019)에서 암호화 지원이 논의되었으나 현재까지 미구현 상태다.

따라서 브라우저에서 PDF 암호화를 구현하려면 **별도 엔진이 반드시 필요**하다.

---

## 2. 옵션 비교

### 2.1 후보 라이브러리 전체 목록

| 라이브러리 | 유형 | npm 패키지 | 번들 크기 | AES-256 지원 | 성숙도 |
|-----------|------|-----------|---------|------------|--------|
| qpdf WASM | WASM | `@cantoo/qpdf` (비공식), 직접 빌드 필요 | ~8MB (gzip ~3MB) | 지원 | 높음 (qpdf 자체는 성숙) |
| mupdf WASM | WASM | `mupdf` (Artifex 공식) | ~15MB (gzip ~5MB) | 지원 | 높음 |
| pdfcpu WASM | WASM | 없음 (Go 기반, 별도 빌드 필요) | ~6MB | 지원 | 중간 |
| pdf-lib-plus (fork) | JS | 없음 (존재하지 않음) | - | 미지원 | - |
| node-forge + 직접 구현 | JS | `node-forge` | ~400KB | 가능하나 PDF 스펙 구현 필요 | 낮음 (직접 구현) |
| **pdf2john / pikepdf 계열** | Python/서버 | 해당 없음 | - | - | 브라우저 불가 |

### 2.2 권장 옵션: `@cantoo/qpdf` 또는 mupdf WASM

---

## 3. qpdf WASM 상세 조사

### 3.1 npm 패키지 존재 여부

공식 qpdf 팀에서 배포하는 WASM npm 패키지는 **존재하지 않는다**.
현존하는 옵션:

- **`@cantoo/qpdf`**: 비공식 커뮤니티 빌드. 존재하나 관리가 불규칙하고 최신 qpdf 버전과 동기화 보장 없음.
- **직접 빌드**: Emscripten으로 qpdf 소스를 WASM으로 컴파일. 가능하나 빌드 환경 구축에 상당한 공수가 필요하다.
- **`qpdf-wasm`** (GitHub 비공식 프로젝트): 일부 존재하나 최신 업데이트 불명.

### 3.2 qpdf WASM API 사용 패턴

`@cantoo/qpdf`를 기준으로 한 사용 패턴:

```typescript
// Worker 내부
import QPDF from '@cantoo/qpdf'

const qpdf = await QPDF()

// 가상 파일시스템에 입력 파일 쓰기
qpdf.FS.writeFile('/input.pdf', inputUint8Array)

// 암호화 실행 (AES-256)
qpdf.callMain([
  '--encrypt',
  userPassword,     // user password
  ownerPassword,    // owner password
  '256',            // 키 길이: 256 = AES-256
  '--',
  '/input.pdf',
  '/output.pdf'
])

// 결과 읽기
const result = qpdf.FS.readFile('/output.pdf')
qpdf.FS.unlink('/input.pdf')
qpdf.FS.unlink('/output.pdf')
```

### 3.3 qpdf AES-256 암호화 설정

qpdf의 `--encrypt` 플래그 구문:
```
--encrypt user-password owner-password key-length [options] --
```

| 키 길이 값 | 암호화 방식 | 권장 |
|-----------|-----------|------|
| 40 | RC4-40 (PDF 1.1) | 사용 금지 |
| 128 | RC4-128 또는 AES-128 | 비권장 |
| 256 | AES-256 (PDF 1.7 ext3) | 권장 |

AES-256 옵션 예시:
```
--encrypt "" "ownerpass" 256 --print=none --modify=none --copy-text=n -- in.pdf out.pdf
```
- `""`: user password 없음 (열람 시 비밀번호 불필요)
- `"ownerpass"`: owner password (편집/인쇄 제한용)
- `--print=none`: 인쇄 불가
- `--modify=none`: 수정 불가

### 3.4 qpdf WASM의 실질적 문제점

1. **번들 크기**: WASM 바이너리 약 8MB. 초기 로딩 지연이 크다.
2. **비공식 패키지**: `@cantoo/qpdf`는 커뮤니티 유지보수로, 장기 지원 불확실.
3. **WASM 메모리**: Emscripten 기본 힙은 16MB. 대용량 PDF(50MB+)는 힙 증가 설정 필요.
4. **Emscripten FS API**: 가상 파일시스템 사용이 직관적이지 않다.

---

## 4. mupdf WASM 상세 조사

### 4.1 패키지 정보

- **npm**: `mupdf` (Artifex 공식 배포, 2023년부터 공식 지원)
- **버전**: `^1.x` (활발히 업데이트 중)
- **번들 크기**: WASM 약 15MB (gzip 약 5MB)
- **라이선스**: AGPL v3 (상업적 사용 시 상용 라이선스 구매 필요)

### 4.2 mupdf API 암호화 지원 여부

mupdf JS 바인딩(`mupdf`)은 주로 **PDF 렌더링, 텍스트 추출, 편집** 기능을 제공하며,
암호화 PDF 생성(setPassword) 기능은 공식 JS API에서 **명시적으로 제공되지 않는다**.
내부적으로 가능하나 C API를 직접 호출하는 우회 방법이 필요하다.

**결론: mupdf는 암호화 구현에 적합하지 않다. 렌더링/미리보기 목적에 적합.**

### 4.3 라이선스 이슈

AGPL v3이므로 상업 서비스에 무료 사용이 불가능할 수 있다. MVP 범위에서 배제 권장.

---

## 5. 대안: Web Crypto API + 직접 PDF 암호화 구현

### 5.1 접근법

브라우저 내장 **Web Crypto API**(`SubtleCrypto`)를 사용하여 AES-256 암호화를 직접 적용하는 방법.

**구현 복잡도:** 매우 높음.
PDF 암호화 스펙(PDF 1.7, ISO 32000)은 다음을 요구한다:
- 암호화 딕셔너리(`/Encrypt`) 생성
- O entry(Owner password hash), U entry(User password hash) 계산
- 각 스트림/문자열 객체 개별 암호화
- 교차 참조 테이블 갱신

이를 순수 JS로 올바르게 구현하는 것은 수백 줄 수준의 PDF 스펙 구현이 필요하다.
**MVP 범위에서 직접 구현은 현실적으로 불가능하다.**

---

## 6. 최종 권장 방안: `pdf-lib-plus` 대신 `node-forge` 기반 암호화 불가 → **`@cantoo/qpdf` WASM 채택**

### 6.1 의사결정 매트릭스

| 기준 | qpdf WASM | mupdf WASM | Web Crypto 직접 구현 |
|------|-----------|-----------|-------------------|
| 암호화 기능 완성도 | 높음 | 낮음 | 구현 필요 |
| 번들 크기 | 8MB | 15MB | 추가 없음 (미현실적) |
| 라이선스 | LGPL/오픈소스 | AGPL (상업 제한) | 해당 없음 |
| 구현 난이도 | 중간 | 높음 | 매우 높음 |
| 유지보수 | 비공식 패키지 | Artifex 공식 | 직접 유지 |
| **권장** | **1순위** | 배제 | 배제 |

---

## 7. Web Worker 구조 설계

### 7.1 전체 아키텍처

```
메인 스레드                          Worker 스레드
─────────────────────────────────────────────────────
[사용자 입력]
  ↓ file.arrayBuffer()
  ↓ passwords
[ArrayBuffer + config]
  → postMessage(Transferable)  →  [Worker 수신]
                                    ↓ WASM 로드 (초기 1회)
                                    ↓ qpdf.FS.writeFile()
                                    ↓ qpdf.callMain([--encrypt ...])
                                    ↓ qpdf.FS.readFile()
                                  [result Uint8Array]
  ← postMessage(Transferable)  ←  [Worker 반환]
[Blob 생성 + 다운로드]
```

### 7.2 Worker 메시지 타입

```typescript
// src/workers/encrypt.worker.ts

export interface EncryptRequest {
  type: 'encrypt'
  pdfBuffer: ArrayBuffer        // Transferable
  userPassword: string          // 열람 비밀번호 (빈 문자열 허용)
  ownerPassword: string         // 편집 제한 비밀번호
  permissions: EncryptPermissions
}

export interface EncryptPermissions {
  allowPrint: boolean           // 인쇄 허용 여부
  allowCopy: boolean            // 텍스트 복사 허용 여부
  allowModify: boolean          // 수정 허용 여부
}

export interface EncryptResponse {
  type: 'success' | 'error'
  result?: ArrayBuffer          // Transferable
  error?: string
}
```

### 7.3 Worker 구현

```typescript
// src/workers/encrypt.worker.ts
import QPDF from '@cantoo/qpdf'

let qpdfInstance: any = null

async function getQpdf() {
  if (!qpdfInstance) {
    qpdfInstance = await QPDF()
  }
  return qpdfInstance
}

self.onmessage = async (e: MessageEvent<EncryptRequest>) => {
  const { pdfBuffer, userPassword, ownerPassword, permissions } = e.data

  try {
    const qpdf = await getQpdf()

    const inputBytes = new Uint8Array(pdfBuffer)
    qpdf.FS.writeFile('/input.pdf', inputBytes)

    const args = [
      '--encrypt',
      userPassword,
      ownerPassword,
      '256',
      `--print=${permissions.allowPrint ? 'full' : 'none'}`,
      `--modify=${permissions.allowModify ? 'all' : 'none'}`,
      permissions.allowCopy ? '' : '--copy-text=n',
      '--',
      '/input.pdf',
      '/output.pdf',
    ].filter(Boolean)

    qpdf.callMain(args)

    const result = qpdf.FS.readFile('/output.pdf') as Uint8Array

    // 메모리 해제
    qpdf.FS.unlink('/input.pdf')
    qpdf.FS.unlink('/output.pdf')

    const resultBuffer = result.buffer.slice(
      result.byteOffset,
      result.byteOffset + result.byteLength
    )

    self.postMessage(
      { type: 'success', result: resultBuffer } satisfies EncryptResponse,
      [resultBuffer]  // Transferable: 복사 없이 소유권 이전
    )
  } catch (err) {
    self.postMessage({
      type: 'error',
      error: err instanceof Error ? err.message : '암호화 중 오류가 발생했어요.',
    } satisfies EncryptResponse)
  }
}
```

### 7.4 메인 스레드에서 Worker 호출

```typescript
// src/lib/pdf/encrypt.ts

export async function encryptPDF(
  file: File,
  userPassword: string,
  ownerPassword: string,
  permissions: EncryptPermissions
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../workers/encrypt.worker.ts', import.meta.url),
      { type: 'module' }
    )

    const pdfBuffer = await file.arrayBuffer()

    worker.postMessage(
      { type: 'encrypt', pdfBuffer, userPassword, ownerPassword, permissions },
      [pdfBuffer]  // Transferable
    )

    worker.onmessage = (e: MessageEvent<EncryptResponse>) => {
      worker.terminate()  // 작업 완료 후 Worker 종료 → 메모리 해제
      if (e.data.type === 'success' && e.data.result) {
        resolve(new Uint8Array(e.data.result))
      } else {
        reject(new Error(e.data.error ?? '알 수 없는 오류'))
      }
    }

    worker.onerror = (err) => {
      worker.terminate()
      reject(new Error(`Worker 오류: ${err.message}`))
    }
  })
}
```

**주의:** `await` 사용으로 인해 위 함수는 `async` 함수여야 하며, `pdfBuffer` 획득 후 `Transferable`로 전달한다.

### 7.5 Vite에서 Web Worker + WASM 빌드 설정

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@cantoo/qpdf'],  // WASM 패키지는 pre-bundle 제외
  },
  worker: {
    format: 'es',               // Worker를 ES 모듈로 번들
  },
  build: {
    target: 'esnext',           // WASM + Worker는 최신 브라우저 필요
  },
})
```

---

## 8. 기존 암호화 PDF 감지 방법

### 8.1 방법 1: pdf-lib load 시도 → 예외로 판단 (현재 구현)

```typescript
try {
  await PDFDocument.load(arrayBuffer)
} catch (e) {
  const msg = e instanceof Error ? e.message : ''
  if (msg.toLowerCase().includes('encrypt') || msg.toLowerCase().includes('password')) {
    // 암호화 PDF로 판단
  }
}
```

현재 `split.ts`와 `merge.ts`에 이미 이 패턴이 구현되어 있다.
**단점:** pdf-lib가 로드를 시도하므로 파일 전체를 파싱한다.

### 8.2 방법 2: PDF 바이너리 직접 검사 (경량)

PDF 파일의 trailer 딕셔너리에 `/Encrypt` 키가 있으면 암호화 파일이다.
파일 전체를 파싱하지 않고 빠르게 감지 가능하다.

```typescript
function isEncryptedPDF(buffer: ArrayBuffer): boolean {
  // PDF trailer는 파일 끝부터 역방향으로 검색
  const bytes = new Uint8Array(buffer)
  const tail = new TextDecoder('latin1').decode(bytes.slice(-2048))  // 마지막 2KB
  return tail.includes('/Encrypt')
}
```

**한계:** 일부 비정형 PDF에서 `/Encrypt`가 다른 위치에 있을 수 있다.
MVP에서는 방법 1(pdf-lib 예외 감지)이 충분하며 이미 구현되어 있다.

### 8.3 방법 3: pdf.js의 password 콜백 활용

pdf.js(`pdfjs-dist`)는 암호화 PDF 로드 시 비밀번호를 요청하는 콜백을 제공한다.
비밀번호 입력 → 암호화 PDF 열람 흐름에는 적합하나, **암호화 생성**에는 사용할 수 없다.
미리보기 기능이 추가되면 검토 가능. MVP 범위에서는 불필요.

---

## 9. 메모리 관리

### 9.1 Worker 종료로 WASM 메모리 해제

```typescript
// 작업 완료 후 반드시 terminate() 호출
worker.terminate()
// → Worker 프로세스 전체가 종료됨
// → WASM 힙 메모리 포함 전체 메모리 해제
// → GC가 즉시 회수하지 않더라도 Worker 컨텍스트 자체가 제거됨
```

**싱글턴 vs 매 요청 신규 생성:**
- 싱글턴 Worker: WASM 초기 로딩 비용(약 1~3초) 1회만 지불. 재사용 가능.
- 매 요청 신규: 메모리 확실히 해제. 초기 로딩 매번 필요.

MVP 권장: **요청당 신규 Worker 생성 + 완료 후 terminate()**
- 암호화는 빈번한 작업이 아니므로 초기 로딩 비용이 허용 가능하다.
- 메모리 누수 위험 제거.

### 9.2 대용량 PDF 메모리 제한

| 브라우저 | 단일 ArrayBuffer 최대 | JS 힙 실질 제한 |
|---------|---------------------|--------------|
| Chrome | 약 2GB (64-bit OS) | OS 여유 메모리의 약 50% |
| Firefox | 약 2GB | 비슷 |
| Safari | 약 1GB | 더 보수적 |
| Mobile | 약 512MB~1GB | 훨씬 제한적 |

WASM 힙은 기본 16MB. qpdf WASM 빌드 시 `INITIAL_MEMORY`, `ALLOW_MEMORY_GROWTH` 플래그로 조정 가능하나 `@cantoo/qpdf` 비공식 빌드의 기본값은 확인 필요.

**MVP 파일 크기 정책 (암호화 기능 한정):**
- 단일 파일 기준 `checkSingleFileSizePolicy` 재활용
- 암호화는 메모리 사용이 크지 않으나(원본 + 결과 2배 정도), WASM 힙 한계를 고려해 50MB warn / 100MB reject 적용 권장 (기존 400MB보다 보수적)

---

## 10. 보안 정책 구현

### 10.1 비밀번호 메모리 참조 해제

브라우저 JS에서 문자열은 GC 대상이므로 즉시 해제가 보장되지 않는다.
최선의 방법:

```typescript
// 비밀번호 사용 후 변수 참조 제거 (GC 유도)
let userPass: string | null = passwordInput
// ... 전달 후
userPass = null  // 참조 제거. GC가 수거할 때 메모리 해제됨.
```

**현실적 한계:** JS는 `SecureString` 같은 메모리 보장 타입이 없다.
React state에 비밀번호가 저장된 경우, 처리 완료 후 state를 빈 문자열로 초기화한다.

```typescript
// 처리 완료 후 즉시 초기화
setUserPassword('')
setOwnerPassword('')
```

### 10.2 User Password vs Owner Password 분리 전략

PDF 암호화는 두 비밀번호를 구분한다:

| 종류 | 역할 | MVP 정책 |
|------|------|---------|
| **User Password** | 파일 열람 시 요구. 없으면 누구나 열람 가능 | 선택 입력 (빈 문자열 허용) |
| **Owner Password** | 인쇄/수정/복사 권한 제어. 없으면 모든 권한 | 필수 입력 권장 |

**권장 UX 흐름:**
1. 사용자가 "열람 비밀번호" (user password) 설정 여부 선택
2. "소유자 비밀번호" (owner password)는 반드시 입력 (권한 제어 기반)
3. User password가 비어있으면 "누구나 열람 가능하지만 편집은 제한됩니다" 안내

---

## 11. 구현 체크리스트 (개발팀 전달)

### 11.1 패키지 설치 및 검증 (선행 필수)

- [ ] `npm install @cantoo/qpdf` 설치 후 브라우저 로딩 테스트
  - 패키지가 실제 동작하는지 먼저 검증할 것 (비공식 패키지이므로)
  - 동작 확인 실패 시 qpdf를 Emscripten으로 직접 빌드하는 방안 검토
- [ ] `vite.config.ts` Worker/WASM 설정 추가
- [ ] WASM 초기 로딩 시간 측정 (목표: 3초 이하)

### 11.2 신규 구현 파일

- [ ] `src/workers/encrypt.worker.ts` — qpdf WASM 래퍼
- [ ] `src/lib/pdf/encrypt.ts` — Worker 호출 인터페이스
- [ ] `src/types/pdf.ts`에 `EncryptPermissions`, `EncryptRequest`, `EncryptResponse` 타입 추가
- [ ] `ActiveTab`에 `'encrypt'` 추가

### 11.3 재활용 항목

- `validate.ts` — `validateFileType`, `checkSingleFileSizePolicy` 재활용
- 기존 암호화 파일 감지 패턴 — `split.ts`, `merge.ts` 동일 패턴

### 11.4 주의사항

- qpdf WASM 로딩은 최초 1회 약 1~3초 소요. 로딩 중 스피너 필수.
- `Transferable` 객체로 ArrayBuffer를 Worker에 전달하면 메인 스레드에서 해당 버퍼에 더 이상 접근할 수 없다. 전달 전 필요한 데이터(파일 이름 등)를 먼저 저장할 것.
- qpdf callMain 인자에 빈 문자열(`''`)이 포함되면 오류 발생. 반드시 filter(Boolean) 처리.
- Owner password가 빈 문자열이면 qpdf가 암호화를 적용하지 않을 수 있음. 빈 owner password 허용 여부는 UX 팀과 협의.

---

## 12. 리스크 및 대안 시나리오

| 리스크 | 발생 확률 | 대응 방안 |
|--------|---------|---------|
| `@cantoo/qpdf` 패키지가 동작하지 않음 | 중간 | qpdf를 Emscripten으로 직접 빌드 (공수 3~5일 추가) |
| WASM 8MB 번들로 초기 로딩 10초 이상 | 낮음 | Lazy 로딩 + 로딩 프로그레스바 |
| 일부 브라우저에서 WASM 메모리 부족 | 낮음 | 파일 크기 제한을 50MB로 낮춤 |
| AGPL 라이선스 이슈 (mupdf 선택 시) | 높음 | mupdf 배제, qpdf(LGPL) 유지 |
| Owner password 없는 암호화 결과 뷰어 호환성 | 낮음 | QA 테스트로 검증 |

---

## 13. 요약

| 항목 | 결정 |
|------|------|
| 암호화 엔진 | `@cantoo/qpdf` WASM (우선 검증 후 채택) |
| 암호화 알고리즘 | AES-256 (키 길이 256, qpdf `--encrypt` 플래그) |
| 실행 환경 | Web Worker (메인 스레드 블로킹 방지) |
| 데이터 전달 | ArrayBuffer Transferable (복사 없이 소유권 이전) |
| Worker 생명주기 | 요청당 신규 생성 + 완료 후 terminate() |
| 암호화 감지 | 기존 pdf-lib 예외 패턴 재활용 |
| 비밀번호 관리 | 처리 완료 후 state 즉시 초기화 |
| 선행 검증 필수 | `@cantoo/qpdf` 패키지 실제 동작 확인 |

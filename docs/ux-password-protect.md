# UX/UI 설계 - PDF 암호화(Password Protect) 화면

> 버전: 1.1
> 기준 문서: PRD v1.3.1, PDF_ENCRYPT_SPEC.md
> 작성일: 2026-03-19
> 기존 Merge / Split / Extract / Delete / Rotate / Reorder UI 패턴과 일관성 유지

---

## 변경 이력

| 버전 | 변경 내용 |
|------|---------|
| 1.0 | 초안 작성 (PRD v1.3 기준) |
| 1.1 | PRD v1.3.1 반영: 8자 미만 권장 안내(PP-07), 완료 후 비밀번호 보관 경고(AC-PP-15), 메모리/스토리지 프라이버시 정책(PP-14/15), 탭 이름 수정, AC 커버리지 전체 갱신, 에지 케이스 추가 |

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
└── 암호화 (Protect)          ← 신규 (7번째 탭)
```

탭이 7개로 늘어나므로 탭 바에 `overflow-x-auto scrollbar-hide` 적용 (ux-rotate-reorder.md Section 16 참고).

---

## 2. 기능 정의

### Password Protect (PDF 암호화)
- 단일 PDF 파일에 열람 비밀번호(User Password)를 설정하여 AES-256 암호화 후 다운로드
- 비밀번호 확인 입력 필드로 오타 방지 (두 값 불일치 시 버튼 비활성)
- 마스킹 기본(●●●), 입력값 보기/숨기기 토글 (두 필드 독립)
- 8자 미만 입력 시 "8자 이상 권장" 힌트 표시 (입력 차단하지 않음)
- 출력 파일명 기본값: `{원본파일명}_protected.pdf` (변경 가능)
- 모든 처리는 브라우저 로컬에서만 수행 (파일 및 비밀번호 서버 전송 없음)
- 완료 후 비밀번호 메모리 참조 해제, localStorage/sessionStorage/IndexedDB 저장 금지
- 이미 암호화된 PDF는 업로드 시점에 즉시 거부
- RC4, 40-bit 등 약한 암호화 미지원 (AES-256 고정)

### Owner Password 처리 (MVP)
- Owner Password는 UI에 노출하지 않음
- 내부적으로 자동 생성하여 적용 (PRD PP-09)
- 사용자가 별도 설정하는 UI는 MVP 범위 제외

---

## 3. 사용자 플로우

```
[탭: 암호화 (Protect)] → [파일 업로드] → [파일 카드 표시]
     → [비밀번호 입력] → (8자 미만: 권장 힌트 표시) → [비밀번호 확인 입력]
     → [출력 파일명 확인/수정] → [암호화하기 버튼 클릭]
     → [WASM 초기화 중 (최초 1회, 1-3초)] → [처리 중 (암호화)]
     → [완료: 자동 다운로드 + 완료 카드 (비밀번호 보관 경고 포함)] 또는 [에러 카드]
```

### 분기 조건
| 조건 | 동작 |
|------|------|
| 이미 암호화된 PDF 업로드 | 즉시 파일 카드 에러 표시 + 처리 거부 (PP-16) |
| 손상된 PDF 업로드 | 즉시 파일 카드 에러 표시 + 처리 거부 (E-PP-07) |
| 파일 크기 > 100MB | 업로드 거부 + 에러 메시지 |
| 파일 크기 50MB~100MB | 업로드 허용 + 경고 배너 표시 |
| 비밀번호 != 비밀번호 확인 | 인라인 에러, 버튼 비활성 |
| 비밀번호 빈 문자열 또는 공백만 | 버튼 비활성 |
| 비밀번호 8자 미만 (비어있지 않은 경우) | "8자 이상 권장" 힌트 표시, 버튼 비활성 해제 안 함 → 8자 미만이어도 일치하면 버튼 활성 |
| WASM 최초 로드 | "암호화 엔진 초기화 중..." 스피너 (1-3초) |
| 처리 중 | "암호화 중..." 스피너, 버튼/입력 비활성 |

---

## 4. 화면 목록

| 화면 ID | 이름 | 설명 |
|---------|------|------|
| PP-S1 | 초기 상태 | 파일 미업로드, FileDropZone 표시 |
| PP-S2 | 파일 업로드 완료 | 파일 카드 + 비밀번호 입력 섹션 표시 |
| PP-S3 | 비밀번호 입력 중 | 비밀번호 입력, 확인 미입력 (버튼 비활성) |
| PP-S3a | 8자 미만 힌트 | 비밀번호 8자 미만 입력 시 권장 힌트 표시 |
| PP-S4 | 비밀번호 불일치 | 확인 필드 인라인 에러 표시 |
| PP-S5 | 버튼 활성 상태 | 두 비밀번호 일치, 버튼 활성 |
| PP-S6 | WASM 초기화 중 | 최초 실행 시 엔진 로딩 스피너 |
| PP-S7 | 처리 중 | 암호화 진행 스피너 |
| PP-S8 | 완료 | 완료 카드 + 비밀번호 보관 경고 + 다운로드 버튼 |
| PP-S9 | 에러 | 에러 카드 (암호화 실패) |
| PP-S10 | 이미 암호화된 파일 | 업로드 시 즉시 파일 카드 에러 |
| PP-S11 | 손상된 파일 | 업로드 시 즉시 파일 카드 에러 |

---

## 5. 레이아웃 설명

### 5.0 탭 바 (App.tsx 수정)
```
[ 병합 | 분할 | 추출 | 삭제 | 회전 | 순서 바꾸기 | 암호화 (Protect) ]
← overflow-x-auto scrollbar-hide (데스크톱에서 모두 보임, 좁은 화면은 가로 스크롤) →
```
- 탭 텍스트: `"암호화 (Protect)"`
- Tab ID: `'encrypt'`
- `type Tab = 'merge' | 'split' | 'extract' | 'delete' | 'rotate' | 'reorder' | 'encrypt'`

---

### 5.1 PP-S1: 초기 상태

```
┌─────────────────────────────────────────────────────┐
│  [탭 바: 병합 | 분할 | 추출 | 삭제 | 회전 | 순서 바꾸기 | 암호화 (Protect)*]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  PDF 암호화                                          │
│  열람 비밀번호를 설정하여 PDF를 보호하세요.              │
│                                                     │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐    │
│  │  PDF 파일을 여기에 드래그하거나                │    │
│  │  [파일 선택] 버튼을 클릭하세요.               │    │
│  │  1개 파일 · PDF만 가능 · 최대 100MB          │    │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘    │
│                                                     │
│  [Shield] 파일과 비밀번호는 서버로 전송되지 않습니다   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### 5.2 PP-S2: 파일 업로드 완료 (비밀번호 미입력)

```
┌─────────────────────────────────────────────┐
│  [탭 바]                                     │
├─────────────────────────────────────────────┤
│                                             │
│  PDF 암호화                                  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ [PDF] document.pdf           12페이지  │  │
│  │       2.4 MB          [X 제거]        │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ── 비밀번호 설정 ──────────────────────────  │
│                                             │
│  열기 비밀번호                               │
│  ┌───────────────────────────────┬────┐    │
│  │                               │[眼]│    │
│  └───────────────────────────────┴────┘    │
│  비밀번호를 입력하세요.                       │
│                                             │
│  비밀번호 확인                               │
│  ┌───────────────────────────────┬────┐    │
│  │                               │[眼]│    │
│  └───────────────────────────────┴────┘    │
│  비밀번호를 한 번 더 입력하세요.              │
│                                             │
│  ── 출력 설정 ──────────────────────────────  │
│                                             │
│  출력 파일명                                 │
│  ┌───────────────────────┐                 │
│  │ document_protected    │ .pdf            │
│  └───────────────────────┘                 │
│                                             │
│  [암호화하기]  ← 비활성 (gray)               │
│                                             │
│  [Lock] AES-256 암호화 · 파일이 서버로 전송되지 않습니다 │
│                                             │
└─────────────────────────────────────────────┘
```

---

### 5.3a PP-S3a: 8자 미만 입력 (권장 힌트)

```
│  열기 비밀번호                               │
│  ┌───────────────────────────────┬────┐    │
│  │ ●●●●●●●                      │[眼]│    │
│  └───────────────────────────────┴────┘    │
│  [Info] 8자 이상 사용을 권장해요.            │  ← 노란/회색 힌트 텍스트 (에러 아님)
```

- 힌트 색상: `text-amber-600` (경고이지만 에러는 아님)
- 테두리: 기본 `border-gray-300` 유지 (빨간 테두리 적용 안 함)
- 버튼: 비밀번호 확인과 일치하면 활성 (8자 미만이어도 진행 가능, PRD PP-07)

---

### 5.4 PP-S4: 비밀번호 불일치 에러

```
│  열기 비밀번호                               │
│  ┌───────────────────────────────┬────┐    │
│  │ ●●●●●●●●                     │[眼]│    │
│  └───────────────────────────────┴────┘    │
│                                             │
│  비밀번호 확인                               │
│  ┌─ 빨간 테두리 (border-red-500) ──┬────┐   │
│  │ ●●●●●●●                       │[眼]│   │
│  └───────────────────────────────┴────┘   │
│  [X] 비밀번호가 일치하지 않습니다.           │  ← text-red-600
│                                             │
│  [암호화하기]  ← 비활성                      │
```

---

### 5.5 PP-S5: 버튼 활성 (두 비밀번호 일치)

```
│  열기 비밀번호                               │
│  ┌─ 초록 테두리 (border-green-500) ─┬────┐  │
│  │ ●●●●●●●●                       │[眼]│  │
│  └────────────────────────────────┴────┘  │
│                                             │
│  비밀번호 확인                               │
│  ┌─ 초록 테두리 (border-green-500) ─┬────┐  │
│  │ ●●●●●●●●                       │[眼]│  │
│  └────────────────────────────────┴────┘  │
│  [Check] 비밀번호가 일치해요.               │  ← text-green-600
│                                             │
│  [암호화하기]  ← 활성 (bg-blue-600)         │
```

---

### 5.6 PP-S6: WASM 초기화 중 (최초 실행 시)

```
│  [파일 카드 - disabled opacity]              │
│  [비밀번호 입력 필드들 - disabled]            │
│  [출력 파일명 - disabled]                   │
│                                             │
│  ┌─ bg-blue-50 border-blue-200 ──────────┐  │
│  │  [Loader2 animate-spin] 암호화 엔진을   │  │
│  │  준비하는 중이에요...                    │  │
│  │  처음 실행 시 잠시 시간이 걸려요. (1~3초)│  │
│  └───────────────────────────────────────┘  │
│                                             │
│  [ [Loader2] 준비 중... ]  ← 버튼 비활성     │
```

- 두 번째 실행부터는 이 상태 없이 바로 PP-S7으로 전환

---

### 5.7 PP-S7: 처리 중 (암호화 중)

```
│  [파일 카드 - disabled opacity]              │
│  [비밀번호 입력 필드들 - disabled]            │
│  [출력 파일명 - disabled]                   │
│                                             │
│  [ [Loader2] 암호화 중... ]  ← 버튼 비활성   │
```

---

### 5.8 PP-S8: 완료 상태

```
│  ┌─ bg-green-50 border-green-200 ────────┐  │
│  │  [CheckCircle text-green-600]          │  │
│  │  암호화 완료!                           │  │
│  │  document_protected.pdf               │  │
│  │  파일이 자동으로 다운로드 되었어요.       │  │
│  │                                       │  │
│  │  ┌─ bg-amber-50 border-amber-200 ──┐  │  │
│  │  │ [AlertTriangle] 비밀번호를 안전하게 │  │  │
│  │  │ 보관하세요. 분실 시 파일을 열 수    │  │  │
│  │  │ 없습니다.                         │  │  │
│  │  └───────────────────────────────┘  │  │
│  │                                       │  │
│  │  [다시 다운로드]    [새 작업 시작]      │  │
│  └───────────────────────────────────────┘  │
```

- 완료 카드 배경: `bg-green-50 border border-green-200 rounded-md`
- 아이콘: `<CheckCircle className="text-green-600" />`
- 비밀번호 보관 경고: `bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-sm text-amber-800` (AC-PP-15)
- 경고 아이콘: `<AlertTriangle className="text-amber-600" />`
- "새 작업 시작": 상태 전체 초기화 + 비밀번호 메모리 참조 해제 → PP-S1
- "다시 다운로드": 동일 파일 재다운로드 (Blob URL 유지)
- MergePage.tsx done 상태와 동일 패턴

---

### 5.9 PP-S9: 에러 상태

```
│  ┌─ bg-red-50 border-red-200 ────────────┐  │
│  │  [AlertCircle text-red-600]            │  │
│  │  암호화 중 오류가 발생했어요.             │  │
│  │  {에러 메시지}                          │  │
│  │                                       │  │
│  │  [다시 시도]                            │  │
│  └───────────────────────────────────────┘  │
```

- `role="alert"` (접근성)
- "다시 시도": 상태를 idle로 되돌림, 파일과 비밀번호 입력값 유지

---

### 5.10 PP-S10: 이미 암호화된 파일 업로드

```
│  ┌─ bg-red-50 border-red-300 ────────────┐  │
│  │ [PDF] already_encrypted.pdf  [X 제거] │  │
│  │ [AlertCircle] 이미 암호화된 파일이에요. │  │
│  │ 암호화되지 않은 PDF를 선택해 주세요.    │  │
│  └───────────────────────────────────────┘  │
```

- `role="alert"`
- 버튼 비활성 유지
- X 버튼으로 파일 제거 후 재선택 가능

---

### 5.11 PP-S11: 손상된 파일 업로드

```
│  ┌─ bg-red-50 border-red-300 ────────────┐  │
│  │ [PDF] corrupted.pdf          [X 제거] │  │
│  │ [AlertCircle] 유효하지 않은 PDF 파일이에요. │  │
│  │ 다른 파일을 선택해 주세요.              │  │
│  └───────────────────────────────────────┘  │
```

---

## 6. 컴포넌트 목록

| 컴포넌트 | 파일 위치 | 설명 | 신규/재사용 |
|---------|----------|------|------------|
| `PasswordProtectPage` | `src/features/encrypt/PasswordProtectPage.tsx` | 메인 페이지 컴포넌트 | 신규 |
| `usePasswordProtect` | `src/features/encrypt/usePasswordProtect.ts` | 상태 관리 훅 | 신규 |
| `PasswordInput` | `src/features/encrypt/PasswordInput.tsx` | 비밀번호 입력 + 보기/숨기기 토글 | 신규 |
| `FileDropZone` | `src/components/FileDropZone.tsx` | 파일 드롭존 | 재사용 (multiple=false) |
| `OutputNameInput` | `src/components/OutputNameInput.tsx` | 출력 파일명 입력 | 재사용 |

---

## 7. 컴포넌트 상세 설계

### 7.1 PasswordInput

```
Props:
  id: string
  label: string              // "열기 비밀번호" | "비밀번호 확인"
  value: string
  onChange: (value: string) => void
  error?: string             // 에러 메시지 (빨간 테두리 + 에러 텍스트)
  warning?: string           // 경고 메시지 (테두리 유지, 노란 힌트 텍스트)
  success?: boolean          // true = 초록 테두리 + 성공 메시지
  successMessage?: string    // "비밀번호가 일치해요."
  disabled?: boolean
  placeholder?: string
  autoComplete?: string      // "new-password"
```

우선순위: `error` > `success` > `warning` (동시에 여러 상태일 경우)

레이아웃:
```
<div>
  <label htmlFor={id}>{label}</label>
  <div className="relative">
    <input
      id={id}
      type={showPassword ? "text" : "password"}
      aria-invalid={!!error}
      aria-describedby={
        error ? `${id}-error` :
        success ? `${id}-success` :
        warning ? `${id}-warning` : undefined
      }
      autoComplete="new-password"
    />
    <button
      type="button"
      onClick={toggleShow}
      aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
    >
      {showPassword ? <EyeOff /> : <Eye />}
    </button>
  </div>
  {error   && <p id={`${id}-error`}   className="text-red-600   text-sm">{error}</p>}
  {!error && success && <p id={`${id}-success`} className="text-green-600 text-sm">{successMessage}</p>}
  {!error && !success && warning && <p id={`${id}-warning`} className="text-amber-600 text-sm">{warning}</p>}
</div>
```

- 보기/숨기기 토글: `<Eye />` / `<EyeOff />` (lucide-react)
- 두 필드의 show/hide 상태는 독립적으로 관리
- `autoComplete="new-password"` 고정 (비밀번호 설정 필드)

---

### 7.2 usePasswordProtect 훅 상태

```typescript
interface PasswordProtectState {
  // 파일
  file: File | null;
  pageCount: number | null;
  fileError: string | null;           // 이미 암호화된 파일 / 손상된 파일 에러

  // 비밀번호
  password: string;
  confirmPassword: string;
  passwordMismatch: boolean;          // 두 값 불일치
  passwordTooShort: boolean;          // 8자 미만 (버튼 차단 안 함)

  // 출력
  outputName: string;                 // 기본값: `${originalName}_protected`

  // 처리 상태
  status: 'idle' | 'wasm-init' | 'processing' | 'done' | 'error';
  errorMessage: string | null;
  resultBlob: Blob | null;
}
```

### 버튼 활성화 조건
```typescript
const passwordValue = password.trim();
const confirmValue = confirmPassword.trim();

const canEncrypt =
  file !== null &&
  fileError === null &&
  passwordValue.length > 0 &&           // 공백만 입력 거부 (E-PP-04)
  confirmValue.length > 0 &&
  password === confirmPassword &&        // 공백 포함 원본값 비교
  outputName.trim().length > 0 &&
  status === 'idle';
// 8자 미만(passwordTooShort)은 버튼 비활성화 조건 아님 (PRD PP-07)
```

### 상태 파생 계산
```typescript
// 비밀번호 8자 미만 힌트 (비어있지 않을 때만)
const passwordTooShort = password.length > 0 && password.length < 8;

// 불일치 검사: 확인 필드에 값이 있을 때만
const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
```

### "새 작업 시작" 클릭 시 처리
```typescript
// 비밀번호 메모리 참조 해제 (PRD PP-14, AC-PP-16)
setPassword('');
setConfirmPassword('');
setFile(null);
setResultBlob(null);
setStatus('idle');
// localStorage/sessionStorage/IndexedDB에 저장하지 않음 (PRD PP-15)
```

---

## 8. 상태별 UX 요약

| 상태 | FileDropZone | 비밀번호 섹션 | 버튼 상태 | 특이사항 |
|------|-------------|------------|---------|---------|
| PP-S1: 초기 | 표시 | 숨김 | 없음 | - |
| PP-S2: 파일 업로드 완료 | 파일 카드 | 표시, 빈 값 | 비활성 | - |
| PP-S3: 비밀번호 입력 중 | 파일 카드 | 한쪽만 입력 | 비활성 | - |
| PP-S3a: 8자 미만 | 파일 카드 | 첫 필드 경고 힌트 | 확인 일치 시 활성 | 노란 힌트 (에러 아님) |
| PP-S4: 비밀번호 불일치 | 파일 카드 | 확인 필드 에러 | 비활성 | 인라인 에러 |
| PP-S5: 비밀번호 일치 | 파일 카드 | 두 필드 초록 | 활성 | - |
| PP-S6: WASM 초기화 | 비활성 | 비활성 | 비활성+스피너 | 최초 1회만 |
| PP-S7: 처리 중 | 비활성 | 비활성 | 비활성+스피너 | - |
| PP-S8: 완료 | 숨김 | 숨김 | 없음 | 완료 카드 + 비밀번호 보관 경고 |
| PP-S9: 에러 | 파일 카드 유지 | 유지 | idle로 복귀 | 에러 카드 |
| PP-S10: 이미 암호화 | 에러 파일 카드 | 숨김 | 비활성 | 파일 카드 내 에러 |
| PP-S11: 손상된 파일 | 에러 파일 카드 | 숨김 | 비활성 | 파일 카드 내 에러 |

---

## 9. 파일 업로드 UX

- FileDropZone props: `multiple={false}`, `accept=".pdf"`, `title="PDF 파일을 여기에 드래그하거나"`, `subtitle="파일 선택 버튼을 클릭하세요"`
- 파일 업로드 후 FileDropZone → 파일 카드로 교체
- 파일 카드: SplitPage.tsx 기존 패턴 재사용
  ```
  flex items-center gap-3 rounded-md border border-gray-200 bg-white px-4 py-3
  ```
- 파일 카드 내 `[X 제거]` 버튼: 클릭 시 상태 전체 초기화 → PP-S1
- 이미 암호화된 파일: 카드 표시하되 `border-red-300 bg-red-50` + 에러 메시지 표시 (PP-S10)
- 손상된 파일: `border-red-300 bg-red-50` + 에러 메시지 표시 (PP-S11)

---

## 10. 비밀번호 보기/숨기기 토글 UX

- 기본: `type="password"` (마스킹)
- 토글 버튼: 입력 필드 오른쪽 끝에 아이콘 버튼
- `<Eye />` 아이콘 = 현재 숨김 상태 (클릭하면 보임)
- `<EyeOff />` 아이콘 = 현재 보임 상태 (클릭하면 숨김)
- 두 필드(비밀번호, 비밀번호 확인)의 보기/숨기기 상태는 독립
- 버튼 aria-label: `showPassword ? "비밀번호 숨기기" : "비밀번호 보기"`
- 처리 중(disabled) 상태에서도 토글 가능 (입력된 값 확인용)

---

## 11. WASM 초기화 상태 UX 상세

### 발생 시점
- 암호화 버튼 최초 클릭 시 (`wasm-init` 상태)
- Web Worker 생성 후 qpdf WASM 모듈 로드 (~1-3초)
- 두 번째 클릭부터는 이 상태 없이 바로 `processing`

### 표시 방법
```
bg-blue-50 border border-blue-200 rounded-md px-4 py-3
<Loader2 className="h-4 w-4 animate-spin text-blue-600" />
"암호화 엔진을 준비하는 중이에요..."
"처음 실행 시 잠시 시간이 걸려요."
```

### 주의사항
- 이 상태에서 모든 입력 필드 `disabled={true}`
- 버튼 텍스트: "준비 중..." (스피너 포함)
- 취소 방법 없음 (WASM 로드 취소 불가) → 기다리도록 안내

---

## 12. 마이크로카피

### 페이지 제목 / 설명
- 제목: `PDF 암호화`
- 부제: `열람 비밀번호를 설정하여 PDF를 보호하세요.`

### 파일 드롭존
- 제목: `PDF 파일을 여기에 드래그하거나`
- 버튼: `파일 선택`
- 힌트: `1개 파일 · PDF만 가능 · 최대 100MB`

### 비밀번호 필드
| 항목 | 텍스트 |
|------|--------|
| 레이블 (첫 번째) | `열기 비밀번호` |
| 플레이스홀더 | `비밀번호를 입력하세요` |
| 레이블 (두 번째) | `비밀번호 확인` |
| 플레이스홀더 | `비밀번호를 한 번 더 입력하세요` |

### 유효성 검사 메시지
| 상황 | 메시지 | 스타일 |
|------|--------|--------|
| 8자 미만 입력 | `8자 이상 사용을 권장해요.` | text-amber-600 (경고) |
| 비밀번호 불일치 | `비밀번호가 일치하지 않습니다.` | text-red-600 (에러) |
| 비밀번호 일치 | `비밀번호가 일치해요.` | text-green-600 (성공) |
| 이미 암호화된 파일 | `이미 암호화된 파일이에요. 암호화되지 않은 PDF를 선택해 주세요.` | text-red-600 |
| 손상된 파일 | `유효하지 않은 PDF 파일이에요. 다른 파일을 선택해 주세요.` | text-red-600 |
| 파일 크기 초과 (100MB) | `파일 크기가 너무 커요. 100MB 이하 파일을 선택해 주세요.` | text-red-600 |
| 파일 크기 경고 (50-100MB) | `파일 크기가 커서 처리 시간이 걸릴 수 있어요.` | text-amber-600 |

### 처리 상태 메시지
| 상태 | 버튼 텍스트 | 배너 텍스트 |
|------|-----------|-----------|
| idle (비활성) | `암호화하기` | - |
| idle (활성) | `암호화하기` | - |
| wasm-init | `준비 중...` | `암호화 엔진을 준비하는 중이에요... 처음 실행 시 잠시 시간이 걸려요.` |
| processing | `암호화 중...` | - |

### 완료 상태
- 완료 제목: `암호화 완료!`
- 완료 설명: `파일이 자동으로 다운로드 되었어요.`
- **비밀번호 보관 경고** (AC-PP-15): `비밀번호를 안전하게 보관하세요. 분실 시 파일을 열 수 없습니다.`
- 완료 버튼 1: `다시 다운로드`
- 완료 버튼 2: `새 작업 시작`

### 에러 상태
- 에러 제목: `암호화 중 오류가 발생했어요.`
- WASM 로드 실패 메시지: `암호화 엔진을 불러올 수 없어요.`
- 처리 실패 메시지: `PDF 암호화 중 오류가 발생했습니다. 다시 시도해주세요.`
- 메모리 부족 메시지: `파일이 너무 커서 처리할 수 없습니다. 더 작은 파일을 사용해주세요.`
- 에러 버튼: `다시 시도`

### 신뢰/프라이버시 문구
- 하단 배지 (항상 표시): `[Lock] AES-256 암호화 · 파일과 비밀번호는 서버로 전송되지 않습니다`
- 초기 상태 배지: `[Shield] 파일과 비밀번호는 서버로 전송되지 않습니다` (PP-13 명시)

---

## 13. 접근성 / 사용성 고려사항

### 키보드 접근성
- 파일 드롭존: Enter/Space로 파일 선택 다이얼로그 열기 (기존 FileDropZone 패턴 유지)
- 비밀번호 보기/숨기기 버튼: `type="button"` (폼 제출 방지), 키보드 포커스 가능
- Tab 순서: 파일 선택 → 열기 비밀번호 → 비밀번호 보기/숨기기 → 비밀번호 확인 → 비밀번호 확인 보기/숨기기 → 출력 파일명 → 암호화하기 버튼

### ARIA
- 비밀번호 입력 필드: `aria-invalid={!!error}`, `aria-describedby="{id}-error|success|warning"`
- 비밀번호 일치/힌트 메시지: `aria-live="polite"` (실시간 업데이트 스크린 리더 알림)
- 에러 카드: `role="alert"` (자동 스크린 리더 알림)
- 처리 중 상태: `aria-busy="true"` on 버튼
- 비밀번호 보관 경고 (완료 카드): `role="note"` 또는 별도 섹션

### 포커스 관리
- 암호화 완료 시: 완료 카드의 "다시 다운로드" 버튼으로 포커스 이동
- 에러 발생 시: 에러 카드로 포커스 이동
- "새 작업 시작" 클릭 시: FileDropZone으로 포커스 이동

### 비밀번호 보안
- 입력 필드: `autoComplete="new-password"` (브라우저 비밀번호 저장 방지)
- 완료 후 비밀번호 값 메모리 참조 해제 필수 (PRD PP-14)
- localStorage/sessionStorage/IndexedDB에 저장 금지 (PRD PP-15)

### 시각적 피드백
- 8자 미만 힌트: 노란 텍스트 (`text-amber-600`), 테두리 변경 없음
- 비밀번호 일치: 초록 테두리 + 체크 아이콘 (`<CheckCircle2 className="text-green-500" />`)
- 비밀번호 불일치: 빨간 테두리 + X 아이콘 (`<XCircle className="text-red-500" />`)
- 파일 드롭 중: `border-blue-500 bg-blue-50` (기존 FileDropZone 패턴)

---

## 14. PRD 요구사항 커버리지 (v1.3.1)

| PRD ID | 요구사항 요약 | UX 반영 위치 |
|--------|-------------|------------|
| PP-01 | 단일 PDF 파일 선택 | FileDropZone (multiple=false) |
| PP-02 | 드래그앤드롭 또는 파일 다이얼로그 | FileDropZone 컴포넌트 |
| PP-03 | 파일명 및 페이지 수 표시 | 파일 카드 (Section 9) |
| PP-04 | 열기 비밀번호 입력 필드 | PasswordInput (첫 번째) |
| PP-05 | 비밀번호 확인 필드, 일치 시 버튼 활성 | PasswordInput (두 번째) + canEncrypt 조건 |
| PP-06 | 마스킹 기본, 보기/숨기기 토글 | Eye/EyeOff 토글 버튼 (Section 10) |
| PP-07 | 8자 미만 시 "8자 이상 권장" 안내 (차단 아님) | PP-S3a, 8자 미만 힌트 (amber) |
| PP-08 | AES-256 사용, RC4/40-bit 미사용 | 하단 신뢰 배지 + 기능 정의 섹션 |
| PP-09 | Owner Password 내부 처리, UI 비노출 | 기능 정의 섹션 명시 |
| PP-10 | 암호화 후 자동 다운로드 | 완료 상태 PP-S8 |
| PP-11 | 출력 파일명 기본값 `{원본}_protected.pdf` | OutputNameInput, 기본값 로직 |
| PP-12 | 처리 중 로딩 상태 | PP-S6 (WASM 초기화), PP-S7 (처리 중) |
| PP-13 | 브라우저 로컬 처리, 서버 전송 없음 | 신뢰 배지: "파일과 비밀번호는 서버로 전송되지 않습니다" |
| PP-14 | 처리 완료 후 비밀번호 메모리 참조 해제 | Section 7.2 "새 작업 시작" 처리, Section 13 참고사항 |
| PP-15 | localStorage/sessionStorage/IndexedDB 저장 금지 | Section 7.2, Section 13 명시 |
| PP-16 | 이미 암호화된 PDF 거부 + 에러 메시지 | PP-S10 파일 카드 에러 |

### AC (Acceptance Criteria) 커버리지

| AC ID | 조건 요약 | UX 반영 |
|-------|---------|---------|
| AC-PP-01 | 파일 선택 후 파일명/페이지수 표시 | 파일 카드 (Section 9) |
| AC-PP-02 | 파일 없으면 버튼 비활성 | canEncrypt: file !== null |
| AC-PP-03 | 비밀번호 필드 마스킹 기본 | type="password" 기본값 |
| AC-PP-04 | 보기/숨기기 전환 작동 | Section 10 상세 설계 |
| AC-PP-05 | 8자 미만 시 "8자 이상 권장" 표시 (버튼 차단 아님) | PP-S3a, warning prop |
| AC-PP-06 | 비밀번호 불일치 시 에러 + 버튼 비활성 | PP-S4, passwordMismatch |
| AC-PP-07 | 비밀번호 일치 시 버튼 활성 | PP-S5, canEncrypt |
| AC-PP-08 | 비밀번호 빈 값 시 버튼 비활성 | canEncrypt: passwordValue.length > 0 |
| AC-PP-09 | 암호화 후 AES-256 PDF 다운로드 | PP-S8 완료 처리 |
| AC-PP-10~12 | 다운로드 파일 비밀번호 동작 | 구현 팀 (PDF 생성 로직) |
| AC-PP-13 | 출력 파일명 기본값 `{원본}_protected.pdf` | OutputNameInput 기본값 |
| AC-PP-14 | 처리 중 로딩 인디케이터 표시 | PP-S6, PP-S7 |
| AC-PP-15 | 완료 후 비밀번호 보관 경고 메시지 | PP-S8 완료 카드 내 경고 배너 |
| AC-PP-16 | 새 작업 시작 시 상태 초기화 + 필드 초기화 | Section 7.2 "새 작업 시작" 처리 |
| AC-PP-17 | 처리 전후 네트워크 전송 없음 | 구현 팀 (브라우저 전용) |
| AC-PP-18 | localStorage 등에 데이터 미저장 | Section 7.2, Section 13 |

---

## 15. 구현 팀을 위한 참고사항

### 파일 구조 (신규 생성 대상)
```
src/features/encrypt/
├── PasswordProtectPage.tsx    ← 메인 페이지
├── usePasswordProtect.ts      ← 상태 관리 훅
└── PasswordInput.tsx          ← 비밀번호 입력 공용 컴포넌트
```

### App.tsx 수정 사항
1. `type Tab` 에 `'encrypt'` 추가
2. 탭 바에 `"암호화 (Protect)"` 탭 항목 추가
3. `<PasswordProtectPage />` 조건부 렌더링 추가

### WASM 초기화 상태 구분
- `status: 'wasm-init'` — qpdf WASM 로드 중 (`ProcessingStatus` 타입 확장 필요)
- `status: 'processing'` — 실제 암호화 중
- 두 상태 모두 모든 입력 disabled, 버튼 비활성

### 기존 컴포넌트 재사용 포인트
- `FileDropZone`: multiple=false 사용, 기존 props 그대로
- `OutputNameInput`: suffix `.pdf` 고정, 기존 패턴 동일
- MergePage.tsx 완료/에러 카드 패턴 그대로 참고

### 이미 암호화된 파일 감지
- pdf-lib로 파일 로드 시 예외 발생 → encrypt 에러로 처리
- 감지 위치: `usePasswordProtect` 훅의 파일 선택 핸들러 내
- 처리: `fileError` 상태 설정, `status`는 `idle` 유지

### 비밀번호 메모리 해제 (PRD PP-14)
- "새 작업 시작" 클릭 시: password, confirmPassword 상태를 `''`로 초기화
- Blob URL은 다운로드 완료 후 `URL.revokeObjectURL()` 호출

---

## 16. 에지 케이스 처리

| 에지 케이스 ID | 상황 | UX 처리 |
|-------------|------|---------|
| E-PP-01 | 비밀번호에 특수문자 포함 | 허용, 별도 제한 없음 |
| E-PP-02 | 매우 긴 비밀번호 (100자 이상) | 허용 (qpdf 제한 범위 내) |
| E-PP-03 | 비밀번호 일치 후 한쪽 수정으로 불일치 | 즉시 에러 표시, 버튼 비활성 |
| E-PP-04 | 공백 문자만 입력 | 버튼 비활성 (canEncrypt: trim() 적용) |
| E-PP-05 | 8자 미만 입력 | "8자 이상 권장" 힌트 표시, 버튼 차단 안 함 (PRD PP-07) |
| E-PP-06 | 파일 크기 50~100MB | 경고 배너 표시 후 진행 허용 |
| E-PP-07 | 파일 크기 > 100MB | 업로드 거부, 에러 메시지 표시 |
| E-PP-08 | 손상된 PDF 파일 | 파일 카드 에러 (PP-S11): "유효하지 않은 PDF 파일이에요." |
| E-PP-09 | 처리 실패 (내부 오류) | 에러 카드 (PP-S9): "PDF 암호화 중 오류가 발생했습니다." |
| E-PP-10 | 브라우저 메모리 부족 | 에러 카드 (PP-S9): "파일이 너무 커서 처리할 수 없습니다." |
| E-PP-11 | WASM 로드 실패 | 에러 카드 (PP-S9): "암호화 엔진을 불러올 수 없어요." |
| E-PP-12 | 새 작업 시작 클릭 | 비밀번호 + 파일 + 결과 모두 초기화, 메모리 참조 해제 |
| E-PP-13 | 출력 파일명 비어있음 | 기본값 `{원본파일명}_protected.pdf` 자동 복원 |
| E-PP-14 | 처리 중 탭 이동 | 처리 계속 진행 (Web Worker 독립 실행) |
| E-PP-15 | 출력 파일명 공백/특수문자 | OutputNameInput 기존 유효성 검사 재사용 |

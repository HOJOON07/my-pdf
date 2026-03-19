# vibe-pdf

브라우저에서 동작하는 올인원 PDF 도구. 서버 업로드 없이 모든 처리가 로컬에서 이루어집니다.

## 주요 기능

| 기능 | 설명 |
|------|------|
| **병합 (Merge)** | 여러 PDF를 하나로 합치기 |
| **분할 (Split)** | PDF를 페이지 범위별로 나누기 |
| **추출 (Extract)** | 특정 페이지만 뽑아 새 PDF 생성 |
| **삭제 (Delete)** | 특정 페이지를 제거한 PDF 생성 |
| **회전 (Rotate)** | 페이지를 90°/180°/270° 회전 |
| **순서 변경 (Reorder)** | 드래그앤드롭으로 페이지 순서 변경 |
| **암호화 (Protect)** | AES-256 비밀번호 보호 적용 |
| **이미지→PDF** | JPG/PNG/WebP/GIF를 PDF로 변환 |

## 기술 스택

- **React 18** + **TypeScript 5** + **Vite 5**
- **Tailwind CSS** + **shadcn/ui**
- **pdf-lib** — PDF 병합/분할/추출/삭제/회전/순서변경/이미지변환
- **pdf-lib-plus-encrypt** — PDF 암호화 (AES-256)
- **@dnd-kit** — 드래그앤드롭 (병합 파일 순서, 페이지 순서, 이미지 순서)
- **JSZip** — 분할 결과 ZIP 다운로드

## 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

## 프로젝트 구조

```
src/
├── App.tsx                    # 메인 앱 (8탭 네비게이션)
├── main.tsx                   # Vite 진입점
├── types/pdf.ts               # 공통 타입 정의
├── components/                # 공통 UI 컴포넌트
│   ├── FileDropZone.tsx       # 파일 드롭존
│   └── ui/                    # shadcn/ui 컴포넌트
├── features/                  # 기능별 모듈
│   ├── merge/                 # PDF 병합
│   ├── split/                 # PDF 분할
│   ├── extract/               # PDF 추출
│   ├── delete/                # PDF 삭제
│   ├── rotate/                # PDF 회전
│   ├── reorder/               # 페이지 순서 변경
│   ├── encrypt/               # PDF 암호화
│   └── image-to-pdf/          # 이미지→PDF 변환
└── lib/
    ├── pdf/                   # PDF 처리 로직
    │   ├── merge.ts
    │   ├── split.ts
    │   ├── rotate.ts
    │   ├── reorder.ts
    │   ├── protect.ts
    │   ├── imageToPdf.ts
    │   ├── validate.ts
    │   └── validateImage.ts
    ├── download.ts            # 다운로드 유틸
    └── cn.ts                  # className 유틸
```

## 핵심 원칙

- **서버 없음** — 모든 파일 처리는 브라우저 내에서만 수행
- **네트워크 요청 없음** — 파일과 비밀번호는 외부로 전송되지 않음
- **로컬 저장 없음** — localStorage, sessionStorage, IndexedDB에 데이터 미저장
- **처리 후 메모리 해제** — 완료 시 파일/비밀번호 참조 즉시 해제

## 라이선스

MIT

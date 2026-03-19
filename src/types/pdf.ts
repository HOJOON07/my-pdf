/** 병합 기능에서 관리하는 파일 항목 */
export interface PdfFileItem {
  /** 화면 표시 및 드래그 재정렬을 위한 고유 식별자 */
  id: string
  file: File
  /** pdf-lib로 로드 후 확인한 실제 페이지 수 */
  pageCount: number
}

/** 분할 모드 */
export type SplitMode = 'all' | 'range'

/** 파일 크기 정책 결과 */
export type FileSizePolicy = 'ok' | 'warn' | 'reject'

/** 페이지 범위 그룹 (분할 시 결과 파일 1개에 해당) */
export interface PageRangeGroup {
  /** 범위 레이블 (파일명 생성용, e.g. "1-3") */
  label: string
  /** 0-based 페이지 인덱스 배열 */
  indices: number[]
}

/**
 * 처리 상태
 * 'wasm-init': 암호화 엔진 초기화 중 (향후 WASM 엔진 교체 대비, 현재 미사용)
 */
export type ProcessingStatus = 'idle' | 'wasm-init' | 'processing' | 'done' | 'error'

/** 앱 탭 */
export type ActiveTab = 'merge' | 'split' | 'extract' | 'delete' | 'rotate' | 'reorder' | 'encrypt' | 'image-to-pdf'

/** Image to PDF 페이지 크기 모드 */
export type PageSizeMode = 'a4' | 'letter' | 'original'

/** Image to PDF 기능에서 관리하는 이미지 항목 */
export interface ImageFileItem {
  id: string
  file: File
  /** URL.createObjectURL(file) — 정상 이미지만 설정, 에러 시 '' */
  previewUrl: string
  /** 유효성 검사 또는 처리 실패 메시지 */
  error?: string
  /** 20MB~50MB 구간 경고 메시지 */
  sizeWarning?: string
  /** GIF 파일 여부 (첫 프레임만 사용 안내) */
  isGif?: boolean
}

/** 회전 각도 */
export type RotateDegree = 90 | 180 | 270

/** 페이지별 회전 정보 */
export interface PageRotation {
  /** 0-based 페이지 인덱스 */
  pageIndex: number
  /** 추가할 회전 각도 */
  rotateDegrees: RotateDegree
}

/** 순서 바꾸기 기능에서 관리하는 페이지 항목 */
export interface PageItem {
  /** dnd-kit 식별자 (로드 시 고정) */
  id: string
  /** 0-based 원본 인덱스, 불변 */
  originalIndex: number
  /** 1-based 원본 페이지 번호, 표시용, 불변 */
  originalPageNumber: number
}

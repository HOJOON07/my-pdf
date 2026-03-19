import type { PageRangeGroup } from '@/types/pdf'

/**
 * 범위 문자열의 단일 토큰을 파싱하여 0-based 인덱스 배열과 레이블 반환
 * 예: "1-3" → { label: "1-3", indices: [0, 1, 2] }
 * 예: "5" → { label: "5", indices: [4] }
 */
function parseToken(token: string, totalPages: number): PageRangeGroup {
  const trimmed = token.trim()
  if (!trimmed) {
    throw new Error('올바른 형식으로 입력해 주세요. 예: 1-5, 7, 9-12')
  }

  const rangeMatch = trimmed.match(/^(\d+)-(\d+)$/)
  const singleMatch = trimmed.match(/^(\d+)$/)

  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10)
    const end = parseInt(rangeMatch[2], 10)

    if (start < 1 || end < 1) {
      throw new Error('페이지 번호는 1부터 시작해요.')
    }
    if (start > end) {
      throw new Error(`시작 페이지가 끝 페이지보다 커요. 예: 1-5 형식으로 입력해 주세요.`)
    }
    if (end > totalPages) {
      throw new Error(`입력한 페이지 번호가 파일의 전체 페이지(${totalPages}페이지)를 초과해요.`)
    }

    const indices: number[] = []
    for (let i = start; i <= end; i++) {
      indices.push(i - 1)
    }
    return { label: `${start}-${end}`, indices }
  } else if (singleMatch) {
    const page = parseInt(singleMatch[1], 10)

    if (page < 1) {
      throw new Error('페이지 번호는 1부터 시작해요.')
    }
    if (page > totalPages) {
      throw new Error(`입력한 페이지 번호가 파일의 전체 페이지(${totalPages}페이지)를 초과해요.`)
    }

    return { label: `${page}`, indices: [page - 1] }
  } else {
    throw new Error('올바른 형식으로 입력해 주세요. 예: 1-5, 7, 9-12')
  }
}

/**
 * 범위 문자열을 파싱하여 0-based 인덱스 배열 반환 (단일 평탄 배열)
 * 예: "1-3, 5" → [0, 1, 2, 4]
 */
export function parsePageRanges(input: string, totalPages: number): number[] {
  const tokens = input.split(',')
  const allIndices: number[] = []
  for (const token of tokens) {
    const group = parseToken(token, totalPages)
    allIndices.push(...group.indices)
  }
  return allIndices
}

/**
 * 범위 문자열을 파싱하여 결과 파일 그룹 배열 반환
 * 예: "1-3, 5" → [{label:"1-3", indices:[0,1,2]}, {label:"5", indices:[4]}]
 */
export function parseRangesIntoGroups(input: string, totalPages: number): PageRangeGroup[] {
  const tokens = input.split(',')
  return tokens.map(token => parseToken(token, totalPages))
}

/**
 * 페이지 범위 입력 실시간 유효성 검사. 유효하면 null, 에러 시 메시지 반환.
 */
export function validateRangeInput(input: string, totalPages: number): string | null {
  if (!input.trim()) return null // 빈 입력은 별도 처리
  try {
    parseRangesIntoGroups(input, totalPages)
    return null
  } catch (e) {
    return e instanceof Error ? e.message : '올바른 형식으로 입력해 주세요.'
  }
}

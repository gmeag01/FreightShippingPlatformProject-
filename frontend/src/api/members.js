import apiClient from './client';

// 관리자가 역할, 상태, 검색어 필터와 페이징 조건으로 전체 회원 목록을 조회한다.
export function fetchAdminMembers(
  { role, status, keyword, page = 0, size = 10, sort = 'id,desc' } = {},
  { signal } = {},
) {
  const params = {
    role: role || undefined,
    status: status || undefined,
    keyword: keyword?.trim() || undefined,
    page,
    size,
    sort,
  };
  return apiClient.get('/admin/members', { params, signal });
}

// 관리자가 특정 회원의 상세 정보를 조회한다. 차주인 경우 차량 정보와 배차 취소 횟수가 함께 반환된다.
export function fetchAdminMemberDetail(memberId, { signal } = {}) {
  return apiClient.get(`/admin/members/${memberId}`, { signal });
}

// 관리자가 회원의 상태(ACTIVE, SUSPENDED)를 변경한다.
export function updateMemberStatus(memberId, status) {
  return apiClient.patch(`/admin/members/${memberId}/status`, { status });
}

import apiClient from './client';

// 관리자가 역할 탭(전체/화주/차주), 검색어, 페이지 조건으로 회원 목록을 조회한다.
export function fetchAdminMembers(
  { role, keyword, page = 0, size = 10, sort = 'id,desc' } = {},
  { signal } = {},
) {
  const params = {
    role: role || undefined,
    keyword: keyword?.trim() || undefined,
    page,
    size,
    sort,
  };
  return apiClient.get('/admin/members', { params, signal });
}

// 상단 탭 뱃지(전체 N, 화주 N, 차주 N)에 표시할 회원 수 통계를 조회한다.
export function fetchMemberCounts({ signal } = {}) {
  return apiClient.get('/admin/members/counts', { signal });
}

// 관리자가 회원의 계정 상태(ACTIVE: 정상, SUSPENDED: 정지)를 변경한다.
export function updateMemberStatus(memberId, status) {
  return apiClient.patch(`/admin/members/${memberId}/status`, { status });
}

// 로그인한 회원 본인의 정보(이름, 연락처, 비밀번호)를 수정한다.
export function updateMyProfile(payload) {
  return apiClient.patch('/members/me', payload);
}

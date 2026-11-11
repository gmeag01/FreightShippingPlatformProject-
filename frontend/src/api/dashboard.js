import apiClient from './client';

/**
 * 관리자 대시보드 통계 및 현황 요약 조회 API
 *
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<import('./client').ApiResponse>}
 */
export function fetchAdminDashboard({ signal } = {}) {
  return apiClient.get('/admin/dashboard', { signal });
}

/**
 * 대시보드 통계 카드 클릭 시 대상 상세 오더 목록 조회 API
 *
 * @param {string} type TODAY_REGISTERED, TODAY_ASSIGNED, TODAY_COMPLETED, URGENT_UNASSIGNED
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<import('./client').ApiResponse>}
 */
export function fetchDashboardOrders(type, { signal } = {}) {
  return apiClient.get('/admin/dashboard/orders', { params: { type }, signal });
}

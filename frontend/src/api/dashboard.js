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

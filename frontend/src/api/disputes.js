import client from './client';

// 처리 대기 중인 분쟁을 페이지 단위로 조회한다.
export function fetchDisputes(page, signal) {
  return client.get('/admin/disputes', { params: { page }, signal });
}

// 처리 완료된 분쟁도 신고 사유와 상태 이력을 확인할 수 있다.
export function fetchDispute(orderId, signal) {
  return client.get(`/admin/disputes/${orderId}`, { signal });
}

// 관리자가 결정한 처리 방법과 메모를 전송한다.
export function resolveDispute(orderId, resolution, memo) {
  return client.post(`/admin/disputes/${orderId}/resolve`, { resolution, memo });
}

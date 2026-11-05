import client from './client';

// 로그인한 화주의 오더를 상태와 페이지 조건으로 조회한다.
export function fetchMyOrders({ status, page = 0, signal } = {}) {
  return client.get('/orders', { params: { status: status || undefined, page }, signal });
}

// 화주 본인에게 허용된 상세 주소, 기사 정보와 변경 이력을 조회한다.
export function fetchOrderDetail(orderId, { signal } = {}) {
  return client.get(`/orders/${orderId}`, { signal });
}

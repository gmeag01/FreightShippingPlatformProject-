import client from './client';

// 로그인한 화주의 오더를 상태와 페이지 조건으로 조회한다.
export function fetchMyOrders({ status, page = 0, signal } = {}) {
  return client.get('/orders', { params: { status: status || undefined, page }, signal });
}

// 화주 본인에게 허용된 상세 주소, 기사 정보와 변경 이력을 조회한다.
export function fetchOrderDetail(orderId, { signal } = {}) {
  return client.get(`/orders/${orderId}`, { signal });
}

// 입력을 검토한 뒤 로그인한 화주의 오더 등록을 요청한다.
export function createOrder(details) {
  return client.post('/orders', details);
}

// 조회 당시 버전을 보내 다른 수정이나 기사 배차를 덮어쓰지 않는다.
export function updateOrder(orderId, version, details) {
  return client.put(`/orders/${orderId}`, { version, details });
}

// 화주/관리자별 취소 경로로 조회한 버전과 사유를 전달한다.
export function cancelOrder(orderId, version, reason, admin = false) {
  return client.post(`${admin ? '/admin' : ''}/orders/${orderId}/cancel`, { version, reason });
}

// 관리자가 상태·차종·상차 희망일로 전체 오더를 조회한다.
export function fetchAdminOrders(params, { signal } = {}) {
  return client.get('/admin/orders', { params, signal });
}

// 관리자의 오더 상세 조회 경로를 사용한다.
export function fetchAdminOrderDetail(orderId, { signal } = {}) {
  return client.get(`/admin/orders/${orderId}`, { signal });
}

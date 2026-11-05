import client from './client';

// 로그인한 차주의 등록 차량 정보를 조회한다. 미등록 상태(404)면 null을 돌려준다.
export const fetchMyVehicle = () =>
  client.get('/vehicles/me').catch((error) => {
    if (error.status === 404 || error.code === 'NOT_FOUND') {
      return null;
    }
    throw error;
  });

// 배차 전(REGISTERED) 상태의 열린 의뢰 목록을 차종·페이지 조건으로 조회한다.
export const fetchOpenOrders = ({ vehicleType, page = 0 } = {}) => {
  const params = { page };
  if (vehicleType) {
    params.vehicleType = vehicleType;
  }
  return client.get('/orders/open', { params });
};

// 수락 전 의뢰 상세를 조회한다. 주소는 시·구까지만 오고, 이미 배차된 의뢰는 409(ORDER_ALREADY_ASSIGNED)다.
export const fetchOpenOrderDetail = (orderId) => client.get(`/orders/open/${orderId}`);

// 차주가 선택한 오더를 수락해 배차완료(ASSIGNED) 상태로 변경한다.
export const acceptOrder = (orderId, { version, confirmMismatch = false }) =>
  client.post(`/orders/${orderId}/accept`, { version, confirmMismatch });

// 배정된 차주가 상차 희망 시각 2시간 전까지 사유를 적어 배차를 취소한다.
export const cancelOrderAssignment = (orderId, reason) =>
  client.post(`/orders/${orderId}/cancel-assignment`, { reason });

import client from './client';

// 차주 내 운송 탭. 서버의 JobTab과 같아야 한다.
export const JOB_TABS = Object.freeze({
  IN_PROGRESS: 'IN_PROGRESS',
  FINISHED: 'FINISHED',
});

// 내게 배정된 운송을 탭(진행 중·끝남)과 페이지로 조회한다. 배정 뒤라 상세주소와 연락처가 함께 온다.
export const fetchMyJobs = ({ tab, page = 0 } = {}) =>
  client.get('/jobs', { params: { status: tab, page } });

// 내 지급 내역을 최신순으로 조회한다.
export const fetchMyPayouts = ({ page = 0 } = {}) => client.get('/payouts', { params: { page } });

// 배정된 차주가 상차 완료를 알린다. 배차완료(ASSIGNED) → 운송중(IN_TRANSIT).
export const completePickup = (orderId) => client.post(`/orders/${orderId}/pickup`);

// 배정된 차주가 하차 완료를 알린다. 운송중(IN_TRANSIT) → 수령확인대기(AWAITING_CONFIRM).
export const completeDropoff = (orderId) => client.post(`/orders/${orderId}/dropoff`);

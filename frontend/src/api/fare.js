import client from './client';

// 도로명 또는 지번 주소를 위도·경도 좌표로 변환한다.
export const geocodeAddress = (address) => client.get('/fares/geocode', { params: { address } });

// 출발지·도착지 좌표, 중량, 차종, 상차 조건으로 추천 차종과 추천 운임을 계산한다.
export const estimateFare = (payload) => client.post('/fares/estimate', payload);

// 관리자: 차종별 단가표와 할증률 전체 목록을 조회한다.
export const fetchAdminFareTable = () => client.get('/admin/fares');

// 관리자: 차종별 기본요금과 km당 단가를 일괄 수정한다.
export const updateAdminFareRates = (rates) => client.put('/admin/fares/rates', { rates });

// 관리자: 4종 할증률을 일괄 수정한다.
export const updateAdminFareSurcharges = (surcharges) =>
  client.put('/admin/fares/surcharges', { surcharges });

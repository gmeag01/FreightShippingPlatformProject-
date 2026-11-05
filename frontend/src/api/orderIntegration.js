import client from './client';

// B 담당 주소 변환·견적 API와 E 담당 배송·결제 API를 공통 클라이언트로 호출한다.
export const geocodeAddress = (address) => client.get('/fares/geocode', { params: { address } });
export const estimateFare = (details) => client.post('/fares/estimate', details);
export const fetchOrderPayment = (id, signal) => client.get(`/orders/${id}/payment`, { signal });
export const confirmOrderReceipt = (id) => client.post(`/orders/${id}/confirm`);
export const reportOrderIssue = (id, reason) => client.post(`/orders/${id}/report`, { reason });

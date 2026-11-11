import client from './client';

// 로그인한 차주 본인의 차량 정보를 조회한다. 미등록(404)인 경우 null을 반환한다.
export const getMyVehicle = () =>
  client.get('/vehicles/me').catch((error) => {
    if (error.status === 404 || error.code === 'VEHICLE_NOT_FOUND' || error.code === 'NOT_FOUND') {
      return null;
    }
    throw error;
  });

// 차주 차량을 최초 등록한다.
export const registerMyVehicle = (payload) => client.post('/vehicles/me', payload);

// 차주의 등록된 차량 정보를 수정한다.
export const updateMyVehicle = (payload) => client.put('/vehicles/me', payload);

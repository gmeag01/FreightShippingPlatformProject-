import client from './client';

export const fetchMyVehicle = () =>
  client.get('/vehicles/me').catch((err) => {
    if (err.status === 404 || err.code === 'NOT_FOUND') {
      return null;
    }
    throw err;
  });

export const fetchOpenOrders = ({ vehicleType, page = 0 } = {}) => {
  const params = { page };
  if (vehicleType) {
    params.vehicleType = vehicleType;
  }
  return client.get('/orders/open', { params });
};

export const acceptOrder = (orderId, { version, confirmMismatch = false }) =>
  client.post(`/orders/${orderId}/accept`, { version, confirmMismatch });

export const cancelOrderAssignment = (orderId, reason) =>
  client.post(`/orders/${orderId}/cancel-assignment`, { reason });

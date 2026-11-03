import client from './client';

export function signup({ email, password, name, phone, role }) {
  return client.post('/auth/signup', { email, password, name, phone, role });
}

export function login(email, password) {
  return client.post('/auth/login', { email, password });
}

export function fetchMe() {
  return client.get('/members/me');
}

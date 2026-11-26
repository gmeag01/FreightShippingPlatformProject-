import apiClient from './client';

// 회원가입. 서버 SignupRequest에 있는 값만 골라 보낸다.
export function signup({ email, password, name, phone, role }) {
  return apiClient.post('/auth/signup', { email, password, name, phone, role });
}

// 로그인. 서버가 토큰을 HttpOnly 쿠키로 심고, 회원 정보(id, email, name, phone, role)를 돌려준다.
export function login(email, password) {
  return apiClient.post('/auth/login', { email, password });
}

// 로그아웃. 서버가 리프레시 토큰을 폐기하고 토큰 쿠키를 지운다.
export function logout() {
  return apiClient.post('/auth/logout');
}

// 지금 로그인한 회원 정보(id, email, name, phone, role)를 가져온다.
export function fetchMe() {
  return apiClient.get('/members/me');
}

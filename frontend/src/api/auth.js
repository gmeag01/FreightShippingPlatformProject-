import apiClient from './client';

// 회원가입. 서버 SignupRequest에 있는 값만 골라 보낸다.
export function signup({ email, password, name, phone, role }) {
  return apiClient.post('/auth/signup', { email, password, name, phone, role });
}

// 로그인. 성공하면 { accessToken, role }을 돌려준다.
export function login(email, password) {
  return apiClient.post('/auth/login', { email, password });
}

// 지금 로그인한 회원 정보(id, email, name, phone, role)를 가져온다.
export function fetchMe() {
  return apiClient.get('/members/me');
}

import axios from 'axios';

export const TOKEN_KEY = 'accessToken';

const client = axios.create({ baseURL: '/api' });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 성공하면 ApiResponse의 data만, 실패하면 { code, message, fieldErrors }를 담은 Error를 돌려준다.
client.interceptors.response.use(
  (response) => response.data?.data,
  (error) => {
    const status = error.response?.status;
    const body = error.response?.data?.error;

    // 토큰이 있었는데 401이면 만료·위조로 보고 로그인 화면으로 보낸다.
    // 토큰 없이 받은 401(로그인 실패 등)은 화면에서 메시지로 처리한다.
    if (status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    const apiError = new Error(body?.message ?? '서버와 통신하지 못했습니다.');
    apiError.code = body?.code ?? 'NETWORK_ERROR';
    apiError.fieldErrors = body?.fieldErrors ?? {};
    apiError.status = status;
    return Promise.reject(apiError);
  },
);

export default client;

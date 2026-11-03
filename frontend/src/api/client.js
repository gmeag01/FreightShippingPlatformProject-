import axios from 'axios';

// 로그인 토큰을 저장하는 localStorage 키. AuthContext와 이 파일이 같은 키를 써야 한다.
export const ACCESS_TOKEN_KEY = 'accessToken';

const NETWORK_ERROR_MESSAGE = '서버와 통신하지 못했습니다.';

// 모든 API 호출이 쓰는 axios 인스턴스. 주소는 /api로 시작하고, 개발 중에는 Vite가 8080 서버로 넘긴다.
const apiClient = axios.create({ baseURL: '/api' });

// 저장된 토큰이 있으면 모든 요청에 Authorization 헤더로 붙인다.
apiClient.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// 성공하면 ApiResponse의 data만, 실패하면 { code, message, fieldErrors, status }를 담은 Error를 돌려준다.
apiClient.interceptors.response.use(
  (response) => response.data?.data,
  (error) => {
    const status = error.response?.status;
    redirectToLoginIfTokenRejected(status);
    return Promise.reject(toApiError(error.response?.data?.error, status));
  },
);

// 토큰이 있었는데 401이면 만료·위조로 보고 로그인 화면으로 보낸다.
// 토큰 없이 받은 401(로그인 실패 등)은 화면에서 메시지로 처리하므로 그대로 둔다.
function redirectToLoginIfTokenRejected(status) {
  const hasAccessToken = Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
  if (status !== 401 || !hasAccessToken) return;

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

// 서버 오류 본문을 화면에서 쓰기 쉬운 Error로 바꾼다. 응답이 없으면(서버 꺼짐 등) NETWORK_ERROR로 만든다.
function toApiError(errorBody, status) {
  const apiError = new Error(errorBody?.message ?? NETWORK_ERROR_MESSAGE);
  apiError.code = errorBody?.code ?? 'NETWORK_ERROR';
  apiError.fieldErrors = errorBody?.fieldErrors ?? {};
  apiError.status = status;
  return apiError;
}

export default apiClient;

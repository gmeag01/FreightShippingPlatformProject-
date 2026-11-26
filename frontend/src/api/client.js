import axios from 'axios';

const NETWORK_ERROR_MESSAGE = '서버와 통신하지 못했습니다.';
// 로그인·회원가입·갱신 요청의 401은 토큰 만료가 아니므로 갱신을 시도하지 않는다.
const AUTH_PATH_PREFIX = '/auth/';

// 모든 API 호출이 쓰는 axios 인스턴스. 주소는 /api로 시작하고, 개발 중에는 Vite가 8080 서버로 넘긴다.
// 토큰은 서버가 HttpOnly 쿠키로 주고받으므로 화면 코드는 토큰을 다루지 않는다.
const apiClient = axios.create({ baseURL: '/api' });

// 동시에 여러 요청이 401을 받아도 갱신 요청은 한 번만 보내도록 진행 중인 갱신을 함께 쓴다.
let refreshPromise = null;
let handleSessionExpired = () => {};

// 갱신까지 실패해 로그인이 끊겼을 때 부를 함수를 등록한다. AuthProvider가 로그인 상태를 비우는 데 쓴다.
export function setSessionExpiredHandler(handler) {
  handleSessionExpired = handler;
}

// 성공하면 ApiResponse의 data만, 실패하면 { code, message, fieldErrors, status }를 담은 Error를 돌려준다.
// 액세스 토큰이 만료돼 401이 오면 리프레시 토큰으로 갱신한 뒤 원래 요청을 한 번 다시 보낸다.
apiClient.interceptors.response.use(
  (response) => response.data?.data,
  async (error) => {
    const status = error.response?.status;
    const originalRequest = error.config;
    if (shouldRefresh(status, originalRequest)) {
      originalRequest.isRetried = true;
      try {
        await refreshSession();
        return await apiClient(originalRequest);
      } catch {
        handleSessionExpired();
      }
    }
    return Promise.reject(toApiError(error.response?.data?.error, status));
  },
);

function shouldRefresh(status, request) {
  if (status !== 401 || !request || request.isRetried) return false;
  return !request.url?.startsWith(AUTH_PATH_PREFIX);
}

function refreshSession() {
  refreshPromise ??= apiClient.post('/auth/refresh').finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
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

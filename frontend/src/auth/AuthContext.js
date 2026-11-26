import { useCallback, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { setSessionExpiredHandler } from '../api/client';
import { AuthContext } from './useAuth';

// 로그아웃 요청이 실패하면 남겨 두는 표시. 토큰 쿠키는 HttpOnly라 화면에서 지울 수 없으므로,
// 다음에 앱을 열 때 이 표시를 보고 로그아웃을 다시 보낸다.
const PENDING_LOGOUT_KEY = 'pendingLogout';

// 서버에 로그아웃을 보낸다. 성공하면 표시를 지우고, 실패하면 표시를 남겨 다음에 다시 보낸다.
function sendLogout() {
  return authApi
    .logout()
    .then(() => localStorage.removeItem(PENDING_LOGOUT_KEY))
    .catch(() => localStorage.setItem(PENDING_LOGOUT_KEY, 'true'));
}

// 로그인 상태(me)와 로그인·로그아웃 함수를 앱 전체에 내려 준다.
export function AuthProvider({ children }) {
  const [me, setMe] = useState(null);
  // 토큰이 HttpOnly 쿠키라 화면에서는 로그인 여부를 바로 알 수 없다. 회원 정보를 받기 전에 화면을 그리면
  // 로그인 화면이 잠깐 보였다가 바뀌므로, 받을 때까지 기다린다.
  const [isLoading, setIsLoading] = useState(true);

  // 새로고침해도 쿠키의 토큰으로 로그인 상태를 되살린다. 토큰 갱신까지 실패하면 비로그인 상태로 둔다.
  // 지난 로그아웃이 실패했으면 남은 쿠키로 다시 로그인되지 않도록 로그아웃부터 보낸다.
  useEffect(() => {
    setSessionExpiredHandler(() => setMe(null));
    if (localStorage.getItem(PENDING_LOGOUT_KEY)) {
      sendLogout().finally(() => setIsLoading(false));
      return;
    }
    authApi
      .fetchMe()
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setIsLoading(false));
  }, []);

  // 로그인하고 받은 회원 정보를 저장한다. 호출한 화면이 역할별 첫 화면으로 이동할 수 있게 회원 정보를 돌려준다.
  const login = useCallback(async (email, password) => {
    const loggedInMember = await authApi.login(email, password);
    // 새로 로그인했으니 지난번에 실패한 로그아웃은 더 보내지 않는다.
    localStorage.removeItem(PENDING_LOGOUT_KEY);
    setMe(loggedInMember);
    return loggedInMember;
  }, []);

  // 화면은 바로 비로그인 상태로 바꾸고, 서버의 토큰 폐기 요청은 결과를 기다리지 않는다.
  const logout = useCallback(() => {
    setMe(null);
    sendLogout();
  }, []);

  // 회원 정보가 수정되었을 때 최신 정보를 다시 불러와 동기화한다.
  const refreshMe = useCallback(async () => {
    try {
      const updated = await authApi.fetchMe();
      setMe(updated);
      return updated;
    } catch {
      return null;
    }
  }, []);

  const authValue = useMemo(
    () => ({ me, isLoading, login, logout, refreshMe }),
    [me, isLoading, login, logout, refreshMe],
  );

  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { setSessionExpiredHandler } from '../api/client';
import { AuthContext } from './useAuth';

// 로그인 상태(me)와 로그인·로그아웃 함수를 앱 전체에 내려 준다.
export function AuthProvider({ children }) {
  const [me, setMe] = useState(null);
  // 토큰이 HttpOnly 쿠키라 화면에서는 로그인 여부를 알 수 없다. 회원 정보를 받아 볼 때까지 화면을 그리지 않아야
  // 로그인 화면이 잠깐 보이지 않는다.
  const [isLoading, setIsLoading] = useState(true);

  // 새로고침해도 쿠키의 토큰으로 로그인 상태를 되살린다. 토큰 갱신까지 실패하면 비로그인 상태로 둔다.
  useEffect(() => {
    setSessionExpiredHandler(() => setMe(null));
    authApi
      .fetchMe()
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setIsLoading(false));
  }, []);

  // 로그인하면 서버가 토큰 쿠키를 심고 회원 정보를 돌려준다. 화면이 역할별 첫 화면으로 이동할 수 있게 회원 정보를 돌려준다.
  const login = useCallback(async (email, password) => {
    const loggedInMember = await authApi.login(email, password);
    setMe(loggedInMember);
    return loggedInMember;
  }, []);

  // 화면은 바로 비로그인 상태로 바꾸고, 서버의 토큰 폐기는 기다리지 않는다. 실패해도 액세스 토큰은 곧 만료된다.
  const logout = useCallback(() => {
    setMe(null);
    authApi.logout().catch(() => {});
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

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { ACCESS_TOKEN_KEY } from '../api/client';
import { AuthContext } from './useAuth';

// 로그인 상태(me)와 로그인·로그아웃 함수를 앱 전체에 내려 준다.
export function AuthProvider({ children }) {
  const [me, setMe] = useState(null);
  // 토큰이 있으면 회원 정보를 받아 올 때까지 화면을 그리지 않아야 로그인 화면이 잠깐 보이지 않는다.
  const [isLoading, setIsLoading] = useState(() => Boolean(localStorage.getItem(ACCESS_TOKEN_KEY)));

  // 새로고침해도 저장된 토큰으로 로그인 상태를 되살린다. 토큰이 만료됐으면 지운다.
  useEffect(() => {
    if (!localStorage.getItem(ACCESS_TOKEN_KEY)) return;
    authApi
      .fetchMe()
      .then(setMe)
      .catch(() => localStorage.removeItem(ACCESS_TOKEN_KEY))
      .finally(() => setIsLoading(false));
  }, []);

  // 토큰을 저장한 뒤 회원 정보를 받아 온다. 화면이 역할별 첫 화면으로 이동할 수 있게 회원 정보를 돌려준다.
  const login = useCallback(async (email, password) => {
    const { accessToken } = await authApi.login(email, password);
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    const loggedInMember = await authApi.fetchMe();
    setMe(loggedInMember);
    return loggedInMember;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    setMe(null);
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

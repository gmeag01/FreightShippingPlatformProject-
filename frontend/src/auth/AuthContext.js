import { useCallback, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { TOKEN_KEY } from '../api/client';
import { AuthContext } from './useAuth';

export function AuthProvider({ children }) {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  // 새로고침해도 저장된 토큰으로 로그인 상태를 되살린다.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    authApi
      .fetchMe()
      .then(setMe)
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { accessToken } = await authApi.login(email, password);
    localStorage.setItem(TOKEN_KEY, accessToken);
    const member = await authApi.fetchMe();
    setMe(member);
    return member;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setMe(null);
  }, []);

  const value = useMemo(() => ({ me, loading, login, logout }), [me, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

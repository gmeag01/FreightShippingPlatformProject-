import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

// 로그인 상태를 꺼내 쓰는 훅. { me, isLoading, login, logout }을 돌려준다.
// me는 로그인한 회원 정보이고, 로그인하지 않았으면 null이다.
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('useAuth는 AuthProvider 안에서만 쓸 수 있습니다.');
  }
  return auth;
}

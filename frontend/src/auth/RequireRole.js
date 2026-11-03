import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROLE_HOME } from './roles';
import { useAuth } from './useAuth';

// 정해진 역할만 들어갈 수 있게 막는다. 로그인하지 않았으면 /login, 역할이 다르면 그 역할의 첫 화면으로 보낸다.
// 서버도 같은 검사를 하지만, 화면에서 먼저 막아야 권한 없는 화면이 잠깐 보이지 않는다.
export default function RequireRole({ role, children }) {
  const { me, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!me) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (me.role !== role) return <Navigate to={ROLE_HOME[me.role]} replace />;
  return children ?? <Outlet />;
}

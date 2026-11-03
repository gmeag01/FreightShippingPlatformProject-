import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROLE_HOME } from './roles';
import { useAuth } from './useAuth';

// 로그인하지 않았으면 /login, 역할이 다르면 그 역할의 첫 화면으로 보낸다.
export default function RequireRole({ role, children }) {
  const { me, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!me) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (me.role !== role) return <Navigate to={ROLE_HOME[me.role]} replace />;
  return children ?? <Outlet />;
}

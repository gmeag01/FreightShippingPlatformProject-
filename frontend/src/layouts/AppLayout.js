import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ROLE_LABEL } from '../auth/roles';
import { useAuth } from '../auth/useAuth';

const MENUS = {
  SHIPPER: [
    { to: '/shipper/orders', label: '내 오더', end: true },
    { to: '/shipper/orders/new', label: '오더 등록' },
  ],
  DRIVER: [
    { to: '/driver/orders', label: '의뢰 목록' },
    { to: '/driver/jobs', label: '내 운송' },
    { to: '/driver/vehicle', label: '내 차량' },
  ],
  ADMIN: [
    { to: '/admin', label: '대시보드', end: true },
    { to: '/admin/orders', label: '오더' },
    { to: '/admin/disputes', label: '분쟁' },
    { to: '/admin/fares', label: '운임' },
    { to: '/admin/members', label: '회원' },
  ],
};

export default function AppLayout() {
  const { me, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app">
      <header className="app-header">
        <strong className="app-title">화물운송플랫폼</strong>
        <div className="app-user">
          <span className="role-badge">{ROLE_LABEL[me.role]}</span>
          <span className="user-name">{me.name}</span>
          <button type="button" className="button-secondary" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
        <nav className="app-nav">
          {MENUS[me.role].map((menu) => (
            <NavLink key={menu.to} to={menu.to} end={menu.end}>
              {menu.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

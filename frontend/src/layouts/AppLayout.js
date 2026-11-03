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
    <div>
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-gray-200 bg-white px-4 py-3">
        <strong>화물운송플랫폼</strong>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-sm">
            {ROLE_LABEL[me.role]}
          </span>
          <span>{me.name}</span>
          <button
            type="button"
            className="rounded-md border border-gray-300 bg-white px-3 py-1 hover:bg-gray-50"
            onClick={handleLogout}
          >
            로그아웃
          </button>
        </div>
        <nav className="flex w-full flex-wrap gap-x-4 gap-y-1">
          {MENUS[me.role].map((menu) => (
            <NavLink
              key={menu.to}
              to={menu.to}
              end={menu.end}
              className={({ isActive }) =>
                isActive ? 'font-semibold text-blue-600' : 'text-gray-500 hover:text-gray-900'
              }
            >
              {menu.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5">
        <Outlet />
      </main>
    </div>
  );
}

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ROLE_LABEL } from '../auth/roles';
import { useAuth } from '../auth/useAuth';

// 역할별 상단 메뉴(설계 문서 6장). end가 true면 주소가 정확히 같을 때만 선택된 메뉴로 보인다.
// (예: '/shipper/orders/new'에 있을 때 '내 오더'까지 선택되어 보이지 않게 한다.)
const ROLE_MENUS = {
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

// 로그인한 뒤의 공통 화면 틀. 머리말(역할, 이름, 로그아웃, 메뉴) 아래에 각 화면(Outlet)을 그린다.
// RequireRole 안에서만 쓰므로 me는 항상 있다.
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
          {ROLE_MENUS[me.role].map((menuItem) => (
            <NavLink
              key={menuItem.to}
              to={menuItem.to}
              end={menuItem.end}
              className={({ isActive }) =>
                isActive ? 'font-semibold text-blue-600' : 'text-gray-500 hover:text-gray-900'
              }
            >
              {menuItem.label}
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

import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ROLE_HOME, ROLE_LABEL } from '../auth/roles';
import { useAuth } from '../auth/useAuth';

// 역할별 상단 메뉴(설계 문서 6장). end가 true면 주소가 정확히 같을 때만 선택된 메뉴로 보인다.
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

// 로그인한 뒤의 공통 화면 틀 (시안: docs/design/ui-guide.md 화면 틀 기준).
// 머리말: bg-ink, 높이 60px, 주황 막대와 서비스명, 역할별 메뉴(현재 메뉴는 하단 3px 주황 선), 우측 역할·이름·로그아웃.
// 본문: min-h-screen bg-ground, max-w-280 pt-7 pb-14 px-6.
// 휴대폰 폭에서는 시안(mobile-driver-orders.png)대로 메뉴를 둘째 줄로 내려 360px에서 가로 스크롤을 막는다.
export default function AppLayout() {
  const { me, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="bg-ground text-copy min-h-screen">
      <header className="bg-ink border-b border-blue-950/40 shadow-xs">
        <div className="mx-auto flex max-w-280 flex-wrap items-center justify-between px-4 sm:h-[60px] sm:flex-nowrap sm:px-6">
          {/* 좌측: 주황색 브랜드 막대 + 서비스 이름 + 역할별 메뉴 */}
          <div className="flex h-full items-center gap-8 max-sm:contents">
            <Link
              to={ROLE_HOME[me.role]}
              className="flex items-center gap-2 transition-opacity hover:opacity-90 max-sm:h-13"
              title="홈으로 이동"
            >
              <span className="bg-signal h-5 w-1 rounded-full" aria-hidden="true" />
              <strong className="text-base font-bold tracking-tight text-white sm:text-lg">
                화물운송플랫폼
              </strong>
            </Link>

            <nav className="flex h-full items-center gap-1 overflow-x-auto max-sm:order-last max-sm:h-11 max-sm:w-full sm:gap-2">
              {ROLE_MENUS[me.role].map((menuItem) => (
                <NavLink
                  key={menuItem.to}
                  to={menuItem.to}
                  end={menuItem.end}
                  className={({ isActive }) =>
                    `inline-flex h-full items-center border-b-[3px] px-3 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'border-signal text-white'
                        : 'border-transparent text-slate-300 hover:text-white'
                    }`
                  }
                >
                  {menuItem.label}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* 우측: 역할 뱃지 + 사용자 이름 + 로그아웃 버튼 */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-sm bg-white/10 px-2 py-0.5 text-xs font-semibold text-slate-200">
              {ROLE_LABEL[me.role]}
            </span>
            <span className="hidden text-sm font-medium text-white sm:inline">{me.name}</span>
            <button
              type="button"
              className="inline-flex min-h-8 items-center justify-center rounded-md border border-white/20 bg-transparent px-3 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
              onClick={handleLogout}
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 본문: ui-guide.md 화면 틀 규격 (mx-auto flex max-w-280 flex-col gap-5 px-6 pt-7 pb-14 break-keep) */}
      <main className="mx-auto flex max-w-280 flex-col gap-5 px-4 pt-7 pb-14 break-keep sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}

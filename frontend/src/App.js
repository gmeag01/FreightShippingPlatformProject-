import { Navigate, Route, Routes } from 'react-router-dom';
import RequireRole from './auth/RequireRole';
import { ROLE_HOME } from './auth/roles';
import { useAuth } from './auth/useAuth';
import AppLayout from './layouts/AppLayout';
import AdminDisputesPage from './pages/AdminDisputesPage';
import AdminMembersPage from './pages/AdminMembersPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import DriverJobsPage from './pages/DriverJobsPage';
import DriverOrderDetailPage from './pages/DriverOrderDetailPage';
import DriverOrdersPage from './pages/DriverOrdersPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import PlaceholderPage from './pages/PlaceholderPage';
import SignupPage from './pages/SignupPage';
import ShipperOrderFormPage from './pages/ShipperOrderFormPage';
import ShipperOrdersPage from './pages/ShipperOrdersPage';
import ShipperOrderDetailPage from './pages/ShipperOrderDetailPage';

// 그 역할만 들어갈 수 있는 화면 묶음을 만든다. 안쪽 화면은 공통 머리말(AppLayout) 아래에 그려진다.
function renderRoleArea(role) {
  return (
    <RequireRole role={role}>
      <AppLayout />
    </RequireRole>
  );
}

// 첫 주소(/)로 들어오면 로그인했을 때는 역할별 첫 화면, 아니면 로그인 화면으로 보낸다.
function RootRedirect() {
  const { me, isLoading } = useAuth();
  if (isLoading) return null;
  return <Navigate to={me ? ROLE_HOME[me.role] : '/login'} replace />;
}

// 화면 주소 목록(설계 문서 6장). 로그인·회원가입 외에는 담당 도메인이 채울 자리 표시 페이지다.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={renderRoleArea('SHIPPER')}>
        <Route path="/shipper/orders" element={<ShipperOrdersPage />} />
        <Route path="/shipper/orders/new" element={<ShipperOrderFormPage />} />
        <Route path="/shipper/orders/:id/edit" element={<ShipperOrderFormPage isEditing />} />
        <Route path="/shipper/orders/:id" element={<ShipperOrderDetailPage />} />
      </Route>

      <Route element={renderRoleArea('DRIVER')}>
        <Route path="/driver/orders" element={<DriverOrdersPage />} />
        <Route path="/driver/orders/:id" element={<DriverOrderDetailPage />} />
        <Route path="/driver/jobs" element={<DriverJobsPage />} />
        <Route path="/driver/vehicle" element={<PlaceholderPage title="내 차량" />} />
      </Route>

      <Route element={renderRoleArea('ADMIN')}>
        <Route path="/admin" element={<PlaceholderPage title="관리자 대시보드" />} />
        <Route path="/admin/orders" element={<AdminOrdersPage />} />
        <Route path="/admin/orders/:id" element={<ShipperOrderDetailPage admin />} />
        <Route path="/admin/disputes" element={<AdminDisputesPage />} />
        <Route path="/admin/fares" element={<PlaceholderPage title="운임 단가표" />} />
        <Route path="/admin/members" element={<AdminMembersPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

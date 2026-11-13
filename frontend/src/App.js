import { Route, Routes } from 'react-router-dom';
import RequireRole from './auth/RequireRole';
import AppLayout from './layouts/AppLayout';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminDisputesPage from './pages/AdminDisputesPage';
import AdminFaresPage from './pages/AdminFaresPage';
import AdminMembersPage from './pages/AdminMembersPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import DriverJobDetailPage from './pages/DriverJobDetailPage';
import DriverJobsPage from './pages/DriverJobsPage';
import DriverOrderDetailPage from './pages/DriverOrderDetailPage';
import DriverOrdersPage from './pages/DriverOrdersPage';
import DriverVehiclePage from './pages/DriverVehiclePage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
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

// 화면 주소 목록(설계 문서 6장). 루트(/)에서는 서비스 소개 메인 화면을 보여 준다.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
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
        <Route path="/driver/jobs/:id" element={<DriverJobDetailPage />} />
        <Route path="/driver/vehicle" element={<DriverVehiclePage />} />
      </Route>

      <Route element={renderRoleArea('ADMIN')}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/orders" element={<AdminOrdersPage />} />
        <Route path="/admin/orders/:id" element={<ShipperOrderDetailPage admin />} />
        <Route path="/admin/disputes" element={<AdminDisputesPage />} />
        <Route path="/admin/fares" element={<AdminFaresPage />} />
        <Route path="/admin/members" element={<AdminMembersPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

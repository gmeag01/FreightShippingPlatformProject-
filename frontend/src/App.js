import { Navigate, Route, Routes } from 'react-router-dom';
import RequireRole from './auth/RequireRole';
import { ROLE_HOME } from './auth/roles';
import { useAuth } from './auth/useAuth';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import PlaceholderPage from './pages/PlaceholderPage';
import SignupPage from './pages/SignupPage';

// 화면은 설계 문서 6장 기준. 로그인·회원가입 외에는 담당 도메인이 채울 자리 표시 페이지다.
function protectedArea(role) {
  return (
    <RequireRole role={role}>
      <AppLayout />
    </RequireRole>
  );
}

function RootRedirect() {
  const { me, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={me ? ROLE_HOME[me.role] : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={protectedArea('SHIPPER')}>
        <Route path="/shipper/orders" element={<PlaceholderPage title="내 오더" />} />
        <Route path="/shipper/orders/new" element={<PlaceholderPage title="오더 등록" />} />
        <Route path="/shipper/orders/:id" element={<PlaceholderPage title="오더 상세" />} />
      </Route>

      <Route element={protectedArea('DRIVER')}>
        <Route path="/driver/orders" element={<PlaceholderPage title="의뢰 목록" />} />
        <Route path="/driver/jobs" element={<PlaceholderPage title="내 운송" />} />
        <Route path="/driver/vehicle" element={<PlaceholderPage title="내 차량" />} />
      </Route>

      <Route element={protectedArea('ADMIN')}>
        <Route path="/admin" element={<PlaceholderPage title="관리자 대시보드" />} />
        <Route path="/admin/orders" element={<PlaceholderPage title="오더 관리" />} />
        <Route path="/admin/disputes" element={<PlaceholderPage title="분쟁 처리" />} />
        <Route path="/admin/fares" element={<PlaceholderPage title="운임 단가표" />} />
        <Route path="/admin/members" element={<PlaceholderPage title="회원 관리" />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

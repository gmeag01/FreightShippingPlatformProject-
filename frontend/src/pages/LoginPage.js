import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ROLE_HOME } from '../auth/roles';
import { useAuth } from '../auth/useAuth';

const INITIAL_LOGIN_FORM = { email: '', password: '' };

// 공통 인증 화면 상단 머리말. 로고를 누르면 서비스 메인 페이지(/)로 이동한다.
function AuthHeader({ rightLink }) {
  return (
    <header className="bg-ink border-b border-blue-950/40">
      <div className="mx-auto flex h-[60px] max-w-280 items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center rounded-md bg-white px-2.5 py-1 transition-opacity hover:opacity-90"
          title="홈으로 이동"
        >
          <img
            src="/images/logo-freighton.png"
            alt="FreightOn"
            className="h-7 w-auto object-contain"
          />
        </Link>
        <Link
          to={rightLink.to}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/25 px-3.5 text-sm font-semibold whitespace-nowrap text-white hover:bg-white/10"
        >
          {rightLink.label}
        </Link>
      </div>
    </header>
  );
}

// 로그인 화면. 로그인에 성공하면 역할별 첫 화면으로 보낸다. 이미 로그인했으면 이 화면을 건너뛴다.
export default function LoginPage() {
  const { me, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loginForm, setLoginForm] = useState(INITIAL_LOGIN_FORM);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 회원가입 화면에서 넘어왔을 때만 true다(SignupPage가 state로 넘긴다).
  const isJustSignedUp = Boolean(location.state?.signedUp);

  if (isLoading) return null;
  if (me) return <Navigate to={ROLE_HOME[me.role]} replace />;

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setLoginForm({ ...loginForm, [name]: value });
  };

  const performLogin = async (email, password) => {
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const loggedInMember = await login(email, password);
      navigate(ROLE_HOME[loggedInMember.role], { replace: true });
    } catch (loginError) {
      setErrorMessage(loginError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await performLogin(loginForm.email, loginForm.password);
  };

  return (
    <div className="bg-ground text-copy min-h-screen break-keep">
      <AuthHeader rightLink={{ to: '/signup', label: '회원가입' }} />
      <main className="mx-auto flex max-w-280 justify-center px-4 pt-10 pb-14 sm:px-6">
        <div className="flex w-full max-w-md flex-col gap-4">
          <form
            className="border-line bg-card flex flex-col gap-4 rounded-lg border p-5 sm:p-6"
            onSubmit={handleSubmit}
          >
            <h1 className="text-h1-sm text-ink sm:text-h1 font-bold">로그인</h1>

            {isJustSignedUp && (
              <p
                role="status"
                className="bg-primary-soft text-ink rounded-lg border border-blue-200 px-4 py-3 text-sm font-medium"
              >
                가입이 완료됐습니다. 로그인해 주세요.
              </p>
            )}

            <label className="text-copy flex flex-col gap-1.5 text-sm font-medium">
              <span>
                이메일 <span className="text-danger">*</span>
              </span>
              <input
                name="email"
                type="email"
                value={loginForm.email}
                onChange={handleInputChange}
                required
                placeholder="name@example.com"
                className="border-line-strong text-ink min-h-11 w-full rounded-md border bg-white px-3 py-2"
              />
            </label>

            <label className="text-copy flex flex-col gap-1.5 text-sm font-medium">
              <span>
                비밀번호 <span className="text-danger">*</span>
              </span>
              <input
                name="password"
                type="password"
                value={loginForm.password}
                onChange={handleInputChange}
                required
                placeholder="비밀번호 입력"
                className="border-line-strong text-ink min-h-11 w-full rounded-md border bg-white px-3 py-2"
              />
            </label>

            {errorMessage && (
              <p
                role="alert"
                className="bg-danger-soft text-danger rounded-lg border border-red-200 px-4 py-3 text-sm font-medium"
              >
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary-dark inline-flex min-h-11 items-center justify-center rounded-md border border-transparent px-4.5 font-semibold whitespace-nowrap text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              {isSubmitting ? '로그인 중…' : '로그인'}
            </button>

            <p className="text-muted text-sm">
              계정이 없으면{' '}
              <Link to="/signup" className="text-primary font-semibold hover:underline">
                회원가입
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}

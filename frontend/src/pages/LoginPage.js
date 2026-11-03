import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ROLE_HOME } from '../auth/roles';
import { useAuth } from '../auth/useAuth';

const INITIAL_LOGIN_FORM = { email: '', password: '' };

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

  // 입력 칸의 name 속성으로 어느 값을 바꿀지 정한다.
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setLoginForm({ ...loginForm, [name]: value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const loggedInMember = await login(loginForm.email, loginForm.password);
      navigate(ROLE_HOME[loggedInMember.role], { replace: true });
    } catch (loginError) {
      setErrorMessage(loginError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6"
        onSubmit={handleSubmit}
      >
        <h1 className="text-2xl font-bold">로그인</h1>
        {isJustSignedUp && <p className="text-green-700">가입이 완료됐습니다. 로그인해 주세요.</p>}

        <label className="block">
          이메일
          <input
            name="email"
            type="email"
            value={loginForm.email}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="block">
          비밀번호
          <input
            name="password"
            type="password"
            value={loginForm.password}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </label>

        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          로그인
        </button>

        <p className="text-gray-500">
          계정이 없으면{' '}
          <Link to="/signup" className="text-blue-600 underline">
            회원가입
          </Link>
        </p>
      </form>
    </main>
  );
}

import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ROLE_HOME } from '../auth/roles';
import { useAuth } from '../auth/useAuth';

export default function LoginPage() {
  const { me, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (me) return <Navigate to={ROLE_HOME[me.role]} replace />;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const member = await login(form.email, form.password);
      navigate(ROLE_HOME[member.role], { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6"
        onSubmit={handleSubmit}
      >
        <h1 className="text-2xl font-bold">로그인</h1>
        {location.state?.signedUp && (
          <p className="text-green-700">가입이 완료됐습니다. 로그인해 주세요.</p>
        )}
        <label className="block">
          이메일
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="block">
          비밀번호
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
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

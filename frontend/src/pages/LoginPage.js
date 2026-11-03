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
    <main className="center-page">
      <form className="card" onSubmit={handleSubmit}>
        <h1>로그인</h1>
        {location.state?.signedUp && (
          <p className="notice">가입이 완료됐습니다. 로그인해 주세요.</p>
        )}
        <label>
          이메일
          <input name="email" type="email" value={form.email} onChange={handleChange} required />
        </label>
        <label>
          비밀번호
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>
          로그인
        </button>
        <p className="muted">
          계정이 없으면 <Link to="/signup">회원가입</Link>
        </p>
      </form>
    </main>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';

const ROLE_OPTIONS = [
  { value: 'SHIPPER', label: '화주' },
  { value: 'DRIVER', label: '차주' },
];

const FIELDS = [
  { name: 'email', label: '이메일', type: 'email' },
  { name: 'password', label: '비밀번호', type: 'password' },
  { name: 'name', label: '이름', type: 'text' },
  { name: 'phone', label: '연락처', type: 'tel' },
];

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'SHIPPER',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setSubmitting(true);
    try {
      await authApi.signup(form);
      navigate('/login', { replace: true, state: { signedUp: true } });
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="center-page">
      <form className="card" onSubmit={handleSubmit}>
        <h1>회원가입</h1>
        <fieldset className="role-select">
          <legend>가입 유형</legend>
          {ROLE_OPTIONS.map((option) => (
            <label key={option.value}>
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={form.role === option.value}
                onChange={handleChange}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
        {FIELDS.map((field) => (
          <label key={field.name}>
            {field.label}
            <input
              name={field.name}
              type={field.type}
              value={form[field.name]}
              onChange={handleChange}
              required
            />
            {fieldErrors[field.name] && <span className="error">{fieldErrors[field.name]}</span>}
          </label>
        ))}
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>
          가입하기
        </button>
        <p className="muted">
          이미 계정이 있으면 <Link to="/login">로그인</Link>
        </p>
      </form>
    </main>
  );
}

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
    <main className="flex min-h-screen items-center justify-center p-4">
      <form
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6"
        onSubmit={handleSubmit}
      >
        <h1 className="text-2xl font-bold">회원가입</h1>
        <fieldset>
          <legend className="mb-2">가입 유형</legend>
          <div className="flex gap-6">
            {ROLE_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-1.5">
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
          </div>
        </fieldset>
        {FIELDS.map((field) => (
          <label key={field.name} className="block">
            {field.label}
            <input
              name={field.name}
              type={field.type}
              value={form[field.name]}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
            {fieldErrors[field.name] && (
              <span className="mt-1 block text-sm text-red-600">{fieldErrors[field.name]}</span>
            )}
          </label>
        ))}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          가입하기
        </button>
        <p className="text-gray-500">
          이미 계정이 있으면{' '}
          <Link to="/login" className="text-blue-600 underline">
            로그인
          </Link>
        </p>
      </form>
    </main>
  );
}

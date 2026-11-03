import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';

// 화면에서 고를 수 있는 가입 유형. 관리자(ADMIN) 계정은 시드 데이터로만 만들기 때문에 넣지 않는다.
const SIGNUP_ROLE_OPTIONS = [
  { value: 'SHIPPER', label: '화주' },
  { value: 'DRIVER', label: '차주' },
];

// 입력 칸 목록. name은 서버 SignupRequest의 필드 이름과 같아야 서버의 필드별 오류를 칸 아래에 보여 줄 수 있다.
const SIGNUP_INPUT_FIELDS = [
  { name: 'email', label: '이메일', type: 'email' },
  { name: 'password', label: '비밀번호', type: 'password' },
  { name: 'name', label: '이름', type: 'text' },
  { name: 'phone', label: '연락처', type: 'tel' },
];

const INITIAL_SIGNUP_FORM = {
  email: '',
  password: '',
  name: '',
  phone: '',
  role: 'SHIPPER',
};

// 회원가입 화면. 가입에 성공하면 로그인 화면으로 보내고, 실패하면 전체 오류와 칸별 오류를 보여 준다.
export default function SignupPage() {
  const navigate = useNavigate();
  const [signupForm, setSignupForm] = useState(INITIAL_SIGNUP_FORM);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 입력 칸의 name 속성으로 어느 값을 바꿀지 정한다.
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setSignupForm({ ...signupForm, [name]: value });
  };

  const clearErrors = () => {
    setErrorMessage('');
    setFieldErrors({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearErrors();
    setIsSubmitting(true);
    try {
      await authApi.signup(signupForm);
      // 가입 직후에는 로그인 화면에서 '가입이 완료됐습니다' 안내를 띄운다.
      navigate('/login', { replace: true, state: { signedUp: true } });
    } catch (signupError) {
      // 입력 검증 실패(INVALID_INPUT)면 서버가 fieldErrors에 칸별 메시지를 담아 보낸다.
      setErrorMessage(signupError.message);
      setFieldErrors(signupError.fieldErrors);
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
        <h1 className="text-2xl font-bold">회원가입</h1>

        <fieldset>
          <legend className="mb-2">가입 유형</legend>
          <div className="flex gap-6">
            {SIGNUP_ROLE_OPTIONS.map((roleOption) => (
              <label key={roleOption.value} className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="role"
                  value={roleOption.value}
                  checked={signupForm.role === roleOption.value}
                  onChange={handleInputChange}
                />
                {roleOption.label}
              </label>
            ))}
          </div>
        </fieldset>

        {SIGNUP_INPUT_FIELDS.map((inputField) => (
          <label key={inputField.name} className="block">
            {inputField.label}
            <input
              name={inputField.name}
              type={inputField.type}
              value={signupForm[inputField.name]}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
            {fieldErrors[inputField.name] && (
              <span className="mt-1 block text-sm text-red-600">
                {fieldErrors[inputField.name]}
              </span>
            )}
          </label>
        ))}

        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
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

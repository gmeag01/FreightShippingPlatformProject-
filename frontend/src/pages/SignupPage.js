import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as authApi from '../api/auth';

// 화면에서 고를 수 있는 가입 유형. 관리자(ADMIN) 계정은 시드 데이터로만 만들기 때문에 넣지 않는다.
const SIGNUP_ROLE_OPTIONS = [
  { value: 'SHIPPER', label: '화주' },
  { value: 'DRIVER', label: '차주' },
];

// 입력 칸 목록. name은 서버 SignupRequest의 필드 이름과 같아야 서버의 필드별 오류를 칸 아래에 보여 줄 수 있다.
const SIGNUP_INPUT_FIELDS = [
  { name: 'email', label: '이메일', type: 'email', placeholder: 'name@example.com' },
  { name: 'password', label: '비밀번호', type: 'password', placeholder: '8자 이상 입력' },
  { name: 'name', label: '이름', type: 'text', placeholder: '홍길동' },
  { name: 'phone', label: '연락처', type: 'tel', placeholder: '010-1234-5678' },
];

// URL 쿼리(?role=DRIVER 등)가 유효한 가입 역할이면 초기값으로 사용한다.
function resolveInitialRole(searchParams) {
  const paramRole = searchParams.get('role')?.toUpperCase();
  const isAllowed = SIGNUP_ROLE_OPTIONS.some((option) => option.value === paramRole);
  return isAllowed ? paramRole : 'SHIPPER';
}

// 회원가입 화면. 가입에 성공하면 로그인 화면으로 보내고, 실패하면 전체 오류와 칸별 오류를 보여 준다.
export default function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [signupForm, setSignupForm] = useState(() => ({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: resolveInitialRole(searchParams),
  }));
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 입력 칸의 name 속성으로 어느 값을 바꿀지 정한다.
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setSignupForm({ ...signupForm, [name]: value });
  };

  const handleRoleSelect = (role) => {
    setSignupForm((prev) => ({ ...prev, role }));
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
      setFieldErrors(signupError.fieldErrors ?? {});
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-ground text-copy min-h-screen break-keep">
      <header className="bg-ink border-b border-blue-950/40">
        <div className="mx-auto flex h-[60px] max-w-280 items-center justify-between px-4 sm:px-6">
          <Link
            to="/"
            className="flex items-center transition-opacity hover:opacity-90"
            title="홈으로 이동"
          >
            <img
              src="/images/logo-freighton-light.png"
              alt="FreightOn"
              className="h-8 w-auto object-contain sm:h-9"
            />
          </Link>
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/25 px-3.5 text-sm font-semibold whitespace-nowrap text-white hover:bg-white/10"
          >
            로그인
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-280 justify-center px-4 pt-10 pb-14 sm:px-6">
        <form
          className="border-line bg-card flex w-full max-w-md flex-col gap-4 rounded-lg border p-5 sm:p-6"
          onSubmit={handleSubmit}
        >
          <h1 className="text-h1-sm text-ink sm:text-h1 font-bold">회원가입</h1>

          <div className="flex flex-col gap-1.5">
            <span className="text-copy text-sm font-medium">
              가입 유형 <span className="text-danger">*</span>
            </span>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="가입 유형 선택">
              {SIGNUP_ROLE_OPTIONS.map((roleOption) => {
                const isSelected = signupForm.role === roleOption.value;
                return (
                  <button
                    key={roleOption.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleRoleSelect(roleOption.value)}
                    className={`min-h-11 rounded-md border px-3.5 font-semibold transition-colors ${
                      isSelected
                        ? 'border-ink bg-ink text-white'
                        : 'border-line-strong text-copy bg-white hover:bg-slate-50'
                    }`}
                  >
                    {roleOption.label}
                  </button>
                );
              })}
            </div>
          </div>

          {SIGNUP_INPUT_FIELDS.map((inputField) => {
            const hasFieldError = Boolean(fieldErrors[inputField.name]);
            return (
              <label
                key={inputField.name}
                className="text-copy flex flex-col gap-1.5 text-sm font-medium"
              >
                <span>
                  {inputField.label} <span className="text-danger">*</span>
                </span>
                <input
                  name={inputField.name}
                  type={inputField.type}
                  value={signupForm[inputField.name]}
                  onChange={handleInputChange}
                  required
                  placeholder={inputField.placeholder}
                  className={`text-ink min-h-11 w-full rounded-md bg-white px-3 py-2 ${
                    hasFieldError ? 'border-danger border-2' : 'border-line-strong border'
                  }`}
                />
                {hasFieldError && (
                  <span className="text-caption text-danger font-medium">
                    {fieldErrors[inputField.name]}
                  </span>
                )}
              </label>
            );
          })}

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
            {isSubmitting ? '가입 처리 중…' : '가입하기'}
          </button>

          <p className="text-muted text-sm">
            이미 계정이 있으면{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              로그인
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}

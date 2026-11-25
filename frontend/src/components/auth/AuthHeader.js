import { Link } from 'react-router-dom';

// 로그인·회원가입 등 인증 화면 공통 상단 머리말. 로고를 누르면 서비스 메인 페이지(/)로 이동한다.
export default function AuthHeader({ rightLink }) {
  return (
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
          to={rightLink.to}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/25 px-3.5 text-sm font-semibold whitespace-nowrap text-white hover:bg-white/10"
        >
          {rightLink.label}
        </Link>
      </div>
    </header>
  );
}

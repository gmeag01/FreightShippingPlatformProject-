import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROLE_HOME, ROLE_LABEL } from '../auth/roles';
import { useAuth } from '../auth/useAuth';

// 상단 헤더에서 쓰는 섹션 이동 목록.
const SECTION_LINKS = [
  { id: 'problem', label: '운송 기준' },
  { id: 'vehicles', label: '지원 차량' },
];

// 기존 화물 중개에서 자주 겪는 문제 두 가지.
const PAIN_POINTS = [
  {
    number: '01',
    title: '부를 때마다 달라지는 운임',
    summary:
      '같은 구간과 짐인데도 시간대나 중개처마다 부르는 요금이 달라 적정 운임을 가늠하기 어렵습니다.',
    points: [
      '출발지·도착지 거리와 차종별 기본 단가로 예상 운임을 바로 계산합니다.',
      '야간·주말·수작업·긴급 할증 비율을 정해진 기준으로 투명하게 합산합니다.',
    ],
  },
  {
    number: '02',
    title: '전화로 잡는 배차와 밀리는 정산',
    summary:
      '통화로 조건을 묻는 사이 다른 차주가 먼저 잡거나, 하차가 끝난 뒤에도 입금이 늦어지는 일이 생깁니다.',
    points: [
      '여러 차주가 동시에 눌러도 가장 먼저 수락한 한 명에게만 배차가 확정됩니다.',
      '오더 등록 시 결제한 운임을 플랫폼이 보관했다가 하차 확인 후 바로 지급합니다.',
    ],
  },
];

// 톤수별 화물 차량 사진·중량·팔레트 기준 목록.
const VEHICLE_SPECS = [
  {
    code: 'TON_1',
    number: '1',
    unit: '톤',
    image: '/images/trucks/cargo_1t.png',
    description: '일반 적재함이 설치된 소형 카고 차량입니다.',
    maxWeight: '1,000',
    pallets: '2',
  },
  {
    code: 'TON_2_5',
    number: '2.5',
    unit: '톤',
    image: '/images/trucks/cargo_2_5t.png',
    description: '일반 적재함이 설치된 준중형 차량입니다.',
    maxWeight: '2,500',
    pallets: '3 ~ 6',
  },
  {
    code: 'TON_5',
    number: '5',
    unit: '톤',
    image: '/images/trucks/cargo_5t.png',
    description: '중형 화물 및 팔레트 간선 운송 차량입니다.',
    maxWeight: '5,000',
    pallets: '8 ~ 10',
  },
  {
    code: 'TON_11',
    number: '11',
    unit: '톤',
    image: '/images/trucks/cargo_11t.png',
    description: '장거리 대량 파렛트 적재가 가능한 대형 차량입니다.',
    maxWeight: '11,000',
    pallets: '16 ~ 18',
  },
  {
    code: 'TON_25',
    number: '25',
    unit: '톤',
    image: '/images/trucks/cargo_25t.png',
    description: '대형 물류와 수출입 화물을 운송하는 초대형 차량입니다.',
    maxWeight: '25,000',
    pallets: '18 ~ 22',
  },
];

const CAROUSEL_SCROLL_STEP = 360;

// 스크롤로 화면에 들어오면 한 번만 노출 상태를 true로 바꾼다.
function useScrollReveal() {
  const elementRef = useRef(null);
  const [isVisible, setIsVisible] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const target = elementRef.current;
    if (!target || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setIsVisible(true);
        observer.disconnect();
      },
      { threshold: 0.14 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return { elementRef, isVisible };
}

// 스크롤 노출 상태에 맞는 전환 클래스를 반환한다.
function revealClass(isVisible) {
  return isVisible
    ? 'translate-y-0 opacity-100 transition-all duration-700 ease-out'
    : 'translate-y-8 opacity-0 transition-all duration-700 ease-out';
}

// 상단 고정 헤더: 밝은 배경 위에 로고, 섹션 이동 링크, 로그인·회원가입 버튼을 배치한다.
function LandingHeader({ me, onLogout }) {
  return (
    <header className="border-line sticky top-0 z-30 border-b bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-280 items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <span className="bg-signal h-5 w-1 rounded-full" aria-hidden="true" />
          <strong className="text-ink text-base font-bold tracking-tight sm:text-lg">
            화물운송플랫폼
          </strong>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="페이지 주요 섹션">
          {SECTION_LINKS.map((linkItem) => (
            <a
              key={linkItem.id}
              href={`#${linkItem.id}`}
              className="text-muted hover:text-ink text-sm font-medium transition-colors"
            >
              {linkItem.label}
            </a>
          ))}
        </nav>

        <HeaderAuthActions me={me} onLogout={onLogout} />
      </div>
    </header>
  );
}

// 헤더 우측 로그인 상태별 버튼 묶음.
function HeaderAuthActions({ me, onLogout }) {
  if (me) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="bg-ground text-ink hidden items-center rounded-sm px-2.5 py-1 text-xs font-semibold sm:inline-flex">
          {ROLE_LABEL[me.role]} · {me.name}
        </span>
        <Link
          to={ROLE_HOME[me.role]}
          className="bg-primary hover:bg-primary-dark inline-flex min-h-10 items-center justify-center rounded-md px-3.5 text-sm font-semibold whitespace-nowrap text-white"
        >
          내 화면으로
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="border-line-strong text-ink inline-flex min-h-10 items-center justify-center rounded-md border bg-white px-3 text-sm font-semibold whitespace-nowrap hover:bg-slate-50"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        to="/login"
        className="border-line-strong text-ink inline-flex min-h-10 items-center justify-center rounded-md border bg-white px-3.5 text-sm font-semibold whitespace-nowrap hover:bg-slate-50"
      >
        로그인
      </Link>
      <Link
        to="/signup"
        className="bg-primary hover:bg-primary-dark inline-flex min-h-10 items-center justify-center rounded-md px-3.5 text-sm font-semibold whitespace-nowrap text-white"
      >
        회원가입
      </Link>
    </div>
  );
}

// 첫 화면 히어로 배너: 트럭 배경 이미지 위에 간결한 카피라이팅과 CTA만 배치한다.
function HeroBannerSection({ me }) {
  const primaryHref = me ? ROLE_HOME[me.role] : '/signup';
  const primaryLabel = me ? '내 화면으로 이동' : '시작하기';

  return (
    <section className="relative min-h-[520px] overflow-hidden bg-slate-200 sm:min-h-[600px]">
      <img
        src="/images/hero-trucks.png"
        alt="다양한 톤수의 화물 운송 차량"
        className="absolute inset-0 h-full w-full object-cover object-bottom"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-slate-900/45 via-slate-900/20 to-transparent"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex max-w-280 flex-col items-center gap-5 px-4 pt-16 text-center sm:px-6 sm:pt-24">
        <h1 className="text-3xl leading-snug font-bold tracking-tight text-white drop-shadow-sm sm:text-5xl sm:leading-tight">
          어떤 화물이든, 정해진 기준으로 바로
        </h1>

        <p className="max-w-xl text-base font-medium text-white/95 drop-shadow-sm sm:text-lg">
          기준 운임 확인부터 차종별 배차와 정산까지 한 번에
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Link
            to={primaryHref}
            className="bg-primary hover:bg-primary-dark inline-flex min-h-11 items-center justify-center rounded-md px-6 text-sm font-semibold text-white shadow-sm transition-colors sm:text-base"
          >
            {primaryLabel}
          </Link>
          <a
            href="#vehicles"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/50 bg-white/15 px-6 text-sm font-semibold text-white backdrop-blur-xs transition-colors hover:bg-white/25 sm:text-base"
          >
            지원 차량 보기
          </a>
        </div>
      </div>
    </section>
  );
}

// 스크롤 진입 시 선이 그려지는 손글씨 원형 SVG 강조 요소.
function ScribbleCircleSvg({ isVisible }) {
  return (
    <svg
      viewBox="0 0 800 350"
      fill="none"
      aria-hidden="true"
      className="pointer-events-none absolute -top-3 -left-3 h-[calc(100%+24px)] w-[calc(100%+24px)]"
      preserveAspectRatio="none"
    >
      <path
        pathLength="1"
        d="M 190 48 C 430 10 735 55 755 178 C 770 282 470 336 165 305 C 25 288 18 145 140 72 C 260 12 520 18 670 82"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
        className={`text-signal scribble-path ${isVisible ? 'scribble-path-active' : ''}`}
      />
    </svg>
  );
}

// 문제 정의 섹션: 현장에서 겪는 불편함 2가지와 해결 기준을 보여 준다.
function ProblemSection() {
  const { elementRef, isVisible } = useScrollReveal();

  return (
    <section id="problem" ref={elementRef} className="bg-white py-20 sm:py-24">
      <div
        className={`mx-auto flex max-w-280 flex-col gap-12 px-4 sm:px-6 ${revealClass(isVisible)}`}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-ink text-2xl font-bold sm:text-4xl">
            운송할 때마다 겪던{' '}
            <span className="relative inline-block px-2">
              <span className="relative z-10">불편함</span>
              <ScribbleCircleSvg isVisible={isVisible} />
            </span>{' '}
            을 줄였습니다
          </h2>
          <p className="text-muted max-w-2xl text-sm sm:text-base">
            현장에서 화주와 차주가 반복해서 겪는 번거로운 절차를 기준 단가와 자동 정산으로
            바꾸었습니다.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {PAIN_POINTS.map((item) => (
            <article
              key={item.number}
              className="border-line bg-ground/50 flex flex-col gap-4 rounded-xl border p-6 sm:p-8"
            >
              <div className="flex items-center gap-3">
                <span className="bg-ink font-num flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold text-white">
                  {item.number}
                </span>
                <h3 className="text-ink text-lg font-bold sm:text-xl">{item.title}</h3>
              </div>
              <p className="text-muted text-sm leading-relaxed sm:text-base">{item.summary}</p>
              <ul className="border-line flex flex-col gap-2 border-t pt-4">
                {item.points.map((point) => (
                  <li
                    key={point}
                    className="text-copy flex items-start gap-2 text-sm leading-relaxed"
                  >
                    <span
                      className="bg-signal mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                      aria-hidden="true"
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// 톤수별 차량 사진, 적재 중량, 팔레트 기준 정보만 표시하는 개별 카드.
function VehicleCarouselCard({ vehicle }) {
  return (
    <article className="border-line flex w-[82%] shrink-0 snap-start flex-col justify-between gap-5 rounded-2xl border bg-white p-6 shadow-xs sm:w-[46%] lg:w-[31.5%]">
      <div className="flex flex-col gap-3">
        <span className="bg-primary inline-flex w-fit items-center rounded-full px-3.5 py-1 text-sm font-bold text-white">
          <span className="font-num">{vehicle.number}</span>
          {vehicle.unit}
        </span>
        <p className="text-muted text-sm">{vehicle.description}</p>
      </div>

      <div className="flex items-center justify-center py-2">
        <img
          src={vehicle.image}
          alt={`${vehicle.number}${vehicle.unit} 화물 차량`}
          draggable={false}
          className="h-40 w-full object-contain sm:h-44"
        />
      </div>

      <div className="bg-ground flex flex-col gap-2 rounded-xl px-4 py-3.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-ink font-bold">화물 적재량(팔레트 기준)</span>
          <span className="text-primary font-bold">
            <span className="font-num">{vehicle.pallets}</span>개
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-subtle">최대 적재 중량</span>
          <span className="text-ink font-semibold">
            <span className="font-num">{vehicle.maxWeight}</span>kg
          </span>
        </div>
      </div>
    </article>
  );
}

// 마우스 좌클릭 드래그로 가로 스크롤을 제어하는 훅.
function useDragScroll(trackRef) {
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ active: false, startX: 0, startScrollLeft: 0 });

  const stopDragging = () => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    setIsDragging(false);
  };

  useEffect(() => {
    window.addEventListener('mouseup', stopDragging);
    return () => window.removeEventListener('mouseup', stopDragging);
  }, []);

  const handleMouseDown = (event) => {
    if (event.button !== 0 || !trackRef.current) return;
    dragRef.current = {
      active: true,
      startX: event.pageX,
      startScrollLeft: trackRef.current.scrollLeft,
    };
    setIsDragging(true);
  };

  const handleMouseMove = (event) => {
    if (!dragRef.current.active || !trackRef.current) return;
    event.preventDefault();
    const deltaX = event.pageX - dragRef.current.startX;
    trackRef.current.scrollLeft = dragRef.current.startScrollLeft - deltaX;
  };

  return { isDragging, handleMouseDown, handleMouseMove, stopDragging };
}

// 좌우 화살표와 마우스 드래그로 톤수별 차량 카드를 넘겨 보는 가로 캐러셀 섹션.
function VehicleShowcaseSection() {
  const trackRef = useRef(null);
  const { elementRef, isVisible } = useScrollReveal();
  const { isDragging, handleMouseDown, handleMouseMove, stopDragging } = useDragScroll(trackRef);

  const scrollByDirection = (direction) => {
    if (!trackRef.current) return;
    trackRef.current.scrollBy({
      left: direction * CAROUSEL_SCROLL_STEP,
      behavior: 'smooth',
    });
  };

  return (
    <section id="vehicles" ref={elementRef} className="bg-ground py-20 sm:py-24">
      <div
        className={`mx-auto flex max-w-280 flex-col gap-8 px-4 sm:px-6 ${revealClass(isVisible)}`}
      >
        <div className="border-ink/80 flex items-baseline gap-3 border-b-2 pb-4">
          <span className="text-primary font-num text-xl font-bold sm:text-2xl">01</span>
          <h2 className="text-ink text-xl font-bold sm:text-2xl">지원 차량 안내</h2>
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="이전 차량 보기"
            onClick={() => scrollByDirection(-1)}
            className="border-line-strong text-ink absolute top-1/2 -left-2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border bg-white shadow-md transition-colors hover:bg-slate-50 sm:-left-5 sm:h-11 sm:w-11"
          >
            &lt;
          </button>

          <div
            ref={trackRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDragging}
            onMouseLeave={stopDragging}
            className={`no-scrollbar flex gap-5 overflow-x-auto py-2 select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab snap-x snap-mandatory'
            }`}
          >
            {VEHICLE_SPECS.map((vehicle) => (
              <VehicleCarouselCard key={vehicle.code} vehicle={vehicle} />
            ))}
          </div>

          <button
            type="button"
            aria-label="다음 차량 보기"
            onClick={() => scrollByDirection(1)}
            className="border-line-strong text-ink absolute top-1/2 -right-2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border bg-white shadow-md transition-colors hover:bg-slate-50 sm:-right-5 sm:h-11 sm:w-11"
          >
            &gt;
          </button>
        </div>
      </div>
    </section>
  );
}

// 하단 푸터: 간단한 가입 안내와 서비스명, 로그인·회원가입 링크를 배치한다.
function LandingFooter({ me }) {
  return (
    <footer className="bg-ink py-14 text-slate-300">
      <div className="mx-auto flex max-w-280 flex-col gap-8 px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-8">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              지금 계정을 만들고 운임 조회와 배차를 시작해 보세요
            </h2>
            <p className="text-sm text-slate-300">
              화주와 차주 계정은 가입 후 바로 오더 등록과 배차 화면을 이용할 수 있습니다.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to={me ? ROLE_HOME[me.role] : '/signup'}
              className="bg-primary hover:bg-primary-dark inline-flex min-h-11 items-center justify-center rounded-md px-5 text-sm font-semibold text-white"
            >
              {me ? '내 화면으로 이동' : '회원가입'}
            </Link>
            {!me && (
              <Link
                to="/login"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/25 px-5 text-sm font-semibold text-white hover:bg-white/10"
              >
                로그인
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5">
            <span className="bg-signal h-4 w-1 rounded-full" aria-hidden="true" />
            <strong className="font-bold text-white">화물운송플랫폼</strong>
          </div>
          <span className="text-slate-400">기준 운임 계산 · 차종별 배차 · 선결제 정산 관리</span>
        </div>
      </div>
    </footer>
  );
}

// 메인 랜딩페이지.
export default function LandingPage() {
  const { me, isLoading, logout } = useAuth();

  if (isLoading) return null;

  return (
    <div className="bg-ground text-copy min-h-screen break-keep">
      <LandingHeader me={me} onLogout={logout} />
      <main>
        <HeroBannerSection me={me} />
        <ProblemSection />
        <VehicleShowcaseSection />
      </main>
      <LandingFooter me={me} />
    </div>
  );
}

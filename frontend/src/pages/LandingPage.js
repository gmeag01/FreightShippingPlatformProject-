import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROLE_HOME, ROLE_LABEL } from '../auth/roles';
import { useAuth } from '../auth/useAuth';
import { formatNumber } from '../order/presentation';

// 상단 헤더에서 쓰는 섹션 이동 목록.
const SECTION_LINKS = [
  { id: 'problem', label: '운송 기준' },
  { id: 'vehicles', label: '차종별 안내' },
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

// 톤수별 화물 차량 제원 및 설계 문서 4장 기준 단가 목록.
const VEHICLE_SPECS = [
  {
    code: 'TON_1',
    number: '1',
    unit: '톤',
    name: '소형 카고 · 탑차',
    category: '소형 화물',
    maxWeight: '1,000',
    cargoSize: '2,800 × 1,600mm',
    pallets: '2',
    recommendedFor: '박스 소포, 소량 파렛트, 도심 근거리 납품',
    baseFare: 30000,
    perKmFare: 1000,
  },
  {
    code: 'TON_2_5',
    number: '2.5',
    unit: '톤',
    name: '준중형 카고 · 윙바디',
    category: '중소형 화물',
    maxWeight: '2,500',
    cargoSize: '4,300 × 1,900mm',
    pallets: '4 ~ 6',
    recommendedFor: '식자재, 유통 대리점 배송, 중소형 설비',
    baseFare: 50000,
    perKmFare: 1400,
  },
  {
    code: 'TON_5',
    number: '5',
    unit: '톤',
    name: '중형 카고 · 윙바디',
    category: '중대형 화물',
    maxWeight: '5,000',
    cargoSize: '6,200 × 2,300mm',
    pallets: '8 ~ 10',
    recommendedFor: '공장 자재, 물류센터 간선, 대량 파렛트 화물',
    baseFare: 80000,
    perKmFare: 1900,
  },
  {
    code: 'TON_11',
    number: '11',
    unit: '톤',
    name: '대형 카고 · 윙바디',
    category: '대형 화물',
    maxWeight: '11,000',
    cargoSize: '9,600 × 2,350mm',
    pallets: '16 ~ 18',
    recommendedFor: '장거리 간선 운송, 대형 제조 납품, 대용량 적재',
    baseFare: 130000,
    perKmFare: 2600,
  },
  {
    code: 'TON_25',
    number: '25',
    unit: '톤',
    name: '초대형 카고 · 트레일러',
    category: '초대형 화물',
    maxWeight: '25,000',
    cargoSize: '10,200 × 2,400mm',
    pallets: '18 ~ 22',
    recommendedFor: '항만 수출입 물량, 중장비, 대형 플랜트 자재',
    baseFare: 200000,
    perKmFare: 3500,
  },
];

// 추천 운임 시뮬레이터 구간 프리셋.
const ROUTE_PRESETS = [
  { id: 'seoul-busan', pickup: '서울 강서구', dropoff: '부산 강서구', distanceKm: 325 },
  { id: 'incheon-daejeon', pickup: '인천 서구', dropoff: '대전 유성구', distanceKm: 140 },
  { id: 'pyeongtaek-gwangju', pickup: '경기 평택시', dropoff: '광주 광산구', distanceKm: 260 },
  { id: 'seoul-icheon', pickup: '서울 금천구', dropoff: '경기 이천시', distanceKm: 55 },
];

// 설계 문서 4장 기준 할증 조건 4종.
const SURCHARGE_OPTIONS = [
  { code: 'NIGHT', label: '야간', rateText: '+20%', rate: 0.2 },
  { code: 'WEEKEND', label: '주말', rateText: '+10%', rate: 0.1 },
  { code: 'MANUAL_LOADING', label: '수작업', rateText: '+15%', rate: 0.15 },
  { code: 'URGENT', label: '긴급', rateText: '+30%', rate: 0.3 },
];

// 차량 선택 아래에 함께 안내하는 플랫폼 핵심 운영 기준 3가지.
const PLATFORM_GUARDS = [
  {
    number: '01',
    title: '5단계 실시간 진행 공유',
    desc: '등록·배차·운송·하차·정산 상태와 변경 시각을 화주와 차주가 같이 봅니다.',
  },
  {
    number: '02',
    title: '중복 수락 없는 선착순 배차',
    desc: '배차 확정 후에만 상세주소가 열리며, 동시 수락 시 한 명만 배차됩니다.',
  },
  {
    number: '03',
    title: '선결제 보관과 24시간 자동 정산',
    desc: '수령 확인 즉시 지급하며 확인이 늦어져도 24시간 뒤 자동으로 정산됩니다.',
  },
];

// 설계 문서 4장: 1,000원 단위 반올림.
const FARE_ROUNDING_UNIT = 1000;

// 기본·거리·할증 금액과 1,000원 단위 반올림 추천 운임을 계산한다.
function calculateSimulatedFare(route, vehicleSpec, selectedSurcharges) {
  const baseFare = vehicleSpec.baseFare;
  const distanceFare = route.distanceKm * vehicleSpec.perKmFare;
  const surchargeRateSum = SURCHARGE_OPTIONS.filter((item) =>
    selectedSurcharges.includes(item.code),
  ).reduce((sum, item) => sum + item.rate, 0);
  const surchargeAmount = Math.round((baseFare + distanceFare) * surchargeRateSum);
  const rawTotal = baseFare + distanceFare + surchargeAmount;
  const recommendedFare = Math.round(rawTotal / FARE_ROUNDING_UNIT) * FARE_ROUNDING_UNIT;
  return { baseFare, distanceFare, surchargeAmount, recommendedFare };
}

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

// 첫 화면 히어로 배너: CJ대한통운 트럭 배경 이미지 위에 간결한 카피라이팅과 CTA만 배치한다.
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
            차종별 운임 보기
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

// 선택된 트럭 톤수의 적재 중량·규격·기본 단가 제원 카드.
function VehicleSpecCard({ vehicle }) {
  return (
    <div className="border-line flex flex-col justify-between gap-6 rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="bg-primary-soft text-primary rounded-sm px-2.5 py-1 text-xs font-semibold">
            {vehicle.category}
          </span>
          <span className="text-subtle text-xs font-medium">
            파렛트 <span className="font-num text-ink font-bold">{vehicle.pallets}</span> PLT
          </span>
        </div>

        <h3 className="text-ink text-2xl font-bold sm:text-3xl">
          <span className="font-num">{vehicle.number}</span>
          {vehicle.unit} {vehicle.name}
        </h3>
        <p className="text-muted text-sm leading-relaxed">{vehicle.recommendedFor}</p>
      </div>

      <dl className="border-line grid grid-cols-2 gap-4 border-t pt-5">
        <div className="flex flex-col gap-1">
          <dt className="text-subtle text-xs">최대 적재 중량</dt>
          <dd className="text-ink text-base font-bold sm:text-lg">
            <span className="font-num">{vehicle.maxWeight}</span>kg
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-subtle text-xs">적재함 규격 (참고)</dt>
          <dd className="text-ink font-num text-sm font-bold sm:text-base">{vehicle.cargoSize}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-subtle text-xs">기본 운임</dt>
          <dd className="text-ink text-base font-bold sm:text-lg">
            <span className="font-num">{formatNumber(vehicle.baseFare)}</span>원
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-subtle text-xs">거리 단가 (km당)</dt>
          <dd className="text-ink text-base font-bold sm:text-lg">
            <span className="font-num">{formatNumber(vehicle.perKmFare)}</span>원
          </dd>
        </div>
      </dl>
    </div>
  );
}

// 선택한 차량 톤수에 맞춰 구간·할증 조건을 고르고 예상 운임을 계산하는 패널.
function VehicleFareCalculator({ vehicle }) {
  const [routeId, setRouteId] = useState(ROUTE_PRESETS[0].id);
  const [selectedSurcharges, setSelectedSurcharges] = useState([]);

  const selectedRoute = ROUTE_PRESETS.find((item) => item.id === routeId) ?? ROUTE_PRESETS[0];
  const estimate = calculateSimulatedFare(selectedRoute, vehicle, selectedSurcharges);

  const toggleSurcharge = (code) => {
    setSelectedSurcharges((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code],
    );
  };

  return (
    <div className="border-line flex flex-col justify-between gap-5 rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-ink text-base font-bold">
            <span className="font-num">{vehicle.number}</span>
            {vehicle.unit} 기준 예상 운임 계산
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {ROUTE_PRESETS.map((route) => {
            const isSelected = route.id === routeId;
            return (
              <button
                key={route.id}
                type="button"
                onClick={() => setRouteId(route.id)}
                className={`min-h-11 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? 'border-ink bg-ink text-white'
                    : 'border-line-strong text-copy bg-white hover:bg-slate-50'
                }`}
              >
                <span className="block font-semibold">
                  {route.pickup} → {route.dropoff}
                </span>
                <span className={`text-caption ${isSelected ? 'text-slate-300' : 'text-subtle'}`}>
                  <span className="font-num">{route.distanceKm}</span>km
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          {SURCHARGE_OPTIONS.map((option) => {
            const isSelected = selectedSurcharges.includes(option.code);
            return (
              <button
                key={option.code}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleSurcharge(option.code)}
                className={`min-h-10 rounded-md border px-3 text-xs font-medium transition-colors sm:text-sm ${
                  isSelected
                    ? 'border-primary bg-primary-soft text-primary font-semibold'
                    : 'border-line-strong text-copy bg-white hover:bg-slate-50'
                }`}
              >
                {option.label} <span className="font-num">{option.rateText}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-line bg-ground/70 flex flex-wrap items-end justify-between gap-4 rounded-lg border p-5">
        <div className="flex flex-col gap-1">
          <span className="text-caption text-subtle">예상 추천 운임</span>
          <strong className="text-fare-lg text-ink font-bold">
            <span className="font-num">{formatNumber(estimate.recommendedFare)}</span>원
          </strong>
        </div>
        <dl className="text-muted flex gap-4 text-xs sm:text-sm">
          <div>
            <dt className="inline">기본 </dt>
            <dd className="text-ink inline font-semibold">
              <span className="font-num">{formatNumber(estimate.baseFare)}</span>원
            </dd>
          </div>
          <div>
            <dt className="inline">거리 </dt>
            <dd className="text-ink inline font-semibold">
              <span className="font-num">{formatNumber(estimate.distanceFare)}</span>원
            </dd>
          </div>
          <div>
            <dt className="inline">할증 </dt>
            <dd className="text-ink inline font-semibold">
              <span className="font-num">{formatNumber(estimate.surchargeAmount)}</span>원
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

// 천국화물운송 레퍼런스 기반 톤수별 트럭 제원·단가 쇼케이스 및 운송 기준 섹션.
function VehicleShowcaseSection() {
  const [selectedCode, setSelectedCode] = useState(VEHICLE_SPECS[2].code);
  const { elementRef, isVisible } = useScrollReveal();
  const activeVehicle =
    VEHICLE_SPECS.find((item) => item.code === selectedCode) ?? VEHICLE_SPECS[2];

  return (
    <section id="vehicles" ref={elementRef} className="bg-ground py-20 sm:py-24">
      <div
        className={`mx-auto flex max-w-280 flex-col gap-10 px-4 sm:px-6 ${revealClass(isVisible)}`}
      >
        <div className="flex flex-col gap-3">
          <h2 className="text-ink text-2xl font-bold sm:text-4xl">지원 차종 및 제원 안내</h2>
          <p className="text-muted max-w-2xl text-sm sm:text-base">
            1톤 소형 화물부터 25톤 대형 화물까지 짐의 크기와 무게에 맞는 트럭 톤수를 선택해 제원과
            기준 운임을 확인하세요.
          </p>
        </div>

        <div className="grid grid-cols-5 gap-2" role="tablist" aria-label="차량 톤수 선택">
          {VEHICLE_SPECS.map((vehicle) => {
            const isSelected = vehicle.code === selectedCode;
            return (
              <button
                key={vehicle.code}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedCode(vehicle.code)}
                className={`flex min-h-14 flex-col items-center justify-center rounded-xl border px-2 py-2.5 transition-all ${
                  isSelected
                    ? 'border-ink bg-ink text-white shadow-sm'
                    : 'border-line text-ink bg-white hover:border-blue-300'
                }`}
              >
                <span className="text-base font-bold sm:text-lg">
                  <span className="font-num">{vehicle.number}</span>
                  {vehicle.unit}
                </span>
                <span
                  className={`hidden text-xs sm:block ${isSelected ? 'text-slate-300' : 'text-subtle'}`}
                >
                  {vehicle.category}
                </span>
              </button>
            );
          })}
        </div>

        <div key={selectedCode} className="animate-fade-up grid gap-6 lg:grid-cols-2">
          <VehicleSpecCard vehicle={activeVehicle} />
          <VehicleFareCalculator vehicle={activeVehicle} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PLATFORM_GUARDS.map((guard) => (
            <div key={guard.number} className="border-line rounded-xl border bg-white p-5">
              <div className="flex items-center gap-2.5">
                <span className="text-primary font-num text-sm font-bold">{guard.number}</span>
                <strong className="text-ink text-base font-bold">{guard.title}</strong>
              </div>
              <p className="text-muted mt-2 text-sm leading-relaxed">{guard.desc}</p>
            </div>
          ))}
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

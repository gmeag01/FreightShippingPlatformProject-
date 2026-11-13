import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROLE_HOME, ROLE_LABEL } from '../auth/roles';
import { useAuth } from '../auth/useAuth';
import { formatNumber } from '../order/presentation';

// 상단 헤더에서 쓰는 섹션 이동 목록.
const SECTION_LINKS = [
  { id: 'problem', label: '문제 해결' },
  { id: 'features', label: '주요 기능' },
];

// 히어로 하단 핵심 지표 3종.
const HERO_METRICS = [
  {
    label: '지원 차종',
    parts: [
      { text: '1', isNum: true },
      { text: '톤 ~ ', isNum: false },
      { text: '25', isNum: true },
      { text: '톤', isNum: false },
    ],
    desc: '소형 카고부터 대형 화물차까지 차종별 기준 단가표 제공',
  },
  {
    label: '진행 관리',
    parts: [
      { text: '5', isNum: true },
      { text: '단계 실시간 공유', isNum: false },
    ],
    desc: '등록·배차·운송·하차·정산 상태와 변경 시각을 모두 기록',
  },
  {
    label: '정산 기준',
    parts: [
      { text: '24', isNum: true },
      { text: '시간 뒤 자동 지급', isNum: false },
    ],
    desc: '수령 확인 즉시 지급하며 확인이 늦어져도 자동으로 정산',
  },
];

// 기존 화물 중개에서 자주 겪는 문제 두 가지와 해결 포인트.
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

// 주요 기능 좌측 탭 목록.
const FEATURE_TABS = [
  {
    id: 'fare',
    number: '01',
    title: '추천 운임 계산',
    desc: '구간 거리와 차종, 할증 조건에 맞춰 기준 운임을 계산합니다.',
  },
  {
    id: 'lifecycle',
    number: '02',
    title: '진행 상태 확인',
    desc: '오더 등록부터 정산 완료까지 5단계 진행 과정을 보여줍니다.',
  },
  {
    id: 'matching',
    number: '03',
    title: '차종별 배차와 주소 보호',
    desc: '내 차량 톤수에 맞는 일감만 보여주고 중복 수락을 막습니다.',
  },
  {
    id: 'settlement',
    number: '04',
    title: '운임 선결제와 분쟁 처리',
    desc: '결제한 운임을 안전하게 보관하고 하차 확인 뒤 지급합니다.',
  },
];

// 5단계 오더 및 정산 상태 프리뷰 목록.
const ORDER_LIFECYCLE_STEPS = [
  {
    step: 1,
    label: '등록·보관',
    badgeLabel: '등록됨',
    badgeClass: 'bg-status-registered text-status-registered-ink',
    paymentLabel: '선결제 보관중',
    summary: '화주가 오더를 올리며 결제한 운임을 플랫폼이 먼저 안전하게 보관합니다.',
  },
  {
    step: 2,
    label: '배차완료',
    badgeLabel: '배차완료',
    badgeClass: 'bg-status-assigned text-status-assigned-ink',
    paymentLabel: '선결제 보관중',
    summary: '조건에 맞는 차주가 수락하면 배차가 확정되고 상·하차 상세주소가 열립니다.',
  },
  {
    step: 3,
    label: '운송중',
    badgeLabel: '운송중',
    badgeClass: 'bg-status-transit text-status-transit-ink',
    paymentLabel: '선결제 보관중',
    summary: '상차 뒤 목적지까지 이동하며 상태 변경 시각과 담당자가 이력에 남습니다.',
  },
  {
    step: 4,
    label: '수령대기',
    badgeLabel: '수령확인대기',
    badgeClass: 'bg-status-awaiting text-status-awaiting-ink',
    paymentLabel: '정산 대기',
    summary: '하차 완료 후 화주 확인을 기다리며, 물품 이상 시 분쟁을 접수할 수 있습니다.',
  },
  {
    step: 5,
    label: '정산완료',
    badgeLabel: '운송완료',
    badgeClass: 'bg-status-completed text-status-completed-ink',
    paymentLabel: '차주 지급완료',
    summary: '수령 확인 즉시(미확인 시 24시간 경과 후) 보관하던 운임을 차주에게 지급합니다.',
  },
];

// 추천 운임 시뮬레이터 구간 프리셋.
const ROUTE_PRESETS = [
  { id: 'seoul-busan', pickup: '서울 강서구', dropoff: '부산 강서구', distanceKm: 325 },
  { id: 'incheon-daejeon', pickup: '인천 서구', dropoff: '대전 유성구', distanceKm: 140 },
  { id: 'pyeongtaek-gwangju', pickup: '경기 평택시', dropoff: '광주 광산구', distanceKm: 260 },
  { id: 'seoul-icheon', pickup: '서울 금천구', dropoff: '경기 이천시', distanceKm: 55 },
];

// 설계 문서 4장 기준 차종별 기본요금 및 km당 단가.
const VEHICLE_RATES = [
  { code: 'TON_1', number: '1', unit: '톤', baseFare: 30000, perKmFare: 1000 },
  { code: 'TON_2_5', number: '2.5', unit: '톤', baseFare: 50000, perKmFare: 1400 },
  { code: 'TON_5', number: '5', unit: '톤', baseFare: 80000, perKmFare: 1900 },
  { code: 'TON_11', number: '11', unit: '톤', baseFare: 130000, perKmFare: 2600 },
  { code: 'TON_25', number: '25', unit: '톤', baseFare: 200000, perKmFare: 3500 },
];

// 설계 문서 4장 기준 할증 조건 4종.
const SURCHARGE_OPTIONS = [
  { code: 'NIGHT', label: '야간', rateText: '+20%', rate: 0.2 },
  { code: 'WEEKEND', label: '주말', rateText: '+10%', rate: 0.1 },
  { code: 'MANUAL_LOADING', label: '수작업', rateText: '+15%', rate: 0.15 },
  { code: 'URGENT', label: '긴급', rateText: '+30%', rate: 0.3 },
];

// 설계 문서 4장: 1,000원 단위 반올림.
const FARE_ROUNDING_UNIT = 1000;

const MATCHING_ITEMS = [
  {
    title: '내 차량 톤수 기준 필터링',
    detail:
      '등록한 차량 크기와 적재 중량에 맞는 오더만 걸러서 보여주기 때문에 일감을 빠르게 고를 수 있습니다.',
  },
  {
    title: '중복 수락 없는 선착순 배차',
    detail: '여러 차주가 동시에 수락 버튼을 눌러도 가장 먼저 요청한 한 명에게만 배차가 확정됩니다.',
  },
  {
    title: '배차 확정 후 상세주소 공개',
    detail:
      '배차 전에는 시·구 단위까지만 노출하고, 수락이 확정된 차주에게만 상세주소와 연락처를 엽니다.',
  },
];

const SETTLEMENT_ITEMS = [
  {
    title: '오더 등록 시 운임 선결제 보관',
    detail:
      '화주가 오더를 올릴 때 운임을 미리 결제해 플랫폼이 보관하므로 운송 뒤 미지급 걱정이 없습니다.',
  },
  {
    title: '하차 24시간 뒤 자동 정산',
    detail:
      '화주가 수령을 확인하면 바로 지급되며, 확인 버튼을 누르지 않아도 24시간 뒤 자동으로 정산됩니다.',
  },
  {
    title: '분쟁 접수 시 지급 보류 및 중재',
    detail:
      '물품 파손이나 정산 이견이 생기면 지급을 멈추고 관리자가 상태 이력과 연락처를 확인해 처리합니다.',
  },
];

// 기본·거리·할증 금액과 1,000원 단위 반올림 추천 운임을 계산한다.
function calculateSimulatedFare(route, vehicleRate, selectedSurcharges) {
  const baseFare = vehicleRate.baseFare;
  const distanceFare = route.distanceKm * vehicleRate.perKmFare;
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
      { threshold: 0.16 },
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

// 숫자 조각과 한글 조각을 구분해 숫자에만 로보토 모노 폰트 클래스를 입힌다.
function MetricValue({ parts }) {
  return (
    <>
      {parts.map((part, index) => (
        <span key={index} className={part.isNum ? 'font-num' : undefined}>
          {part.text}
        </span>
      ))}
    </>
  );
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

// 첫 화면 히어로 배너: 밝은 하늘색 그라데이션 배경에 헤드라인, 보조 설명, 시작 버튼, 상세 지표를 배치한다.
function HeroBannerSection({ me }) {
  const primaryHref = me ? ROLE_HOME[me.role] : '/signup';
  const primaryLabel = me ? '내 화면으로 이동' : '시작하기';

  return (
    <section className="border-line via-ground relative overflow-hidden border-b bg-gradient-to-b from-blue-50 to-white py-20 sm:py-28">
      <div className="mx-auto flex max-w-280 flex-col gap-10 px-4 sm:px-6">
        <div className="flex flex-col gap-5">
          <h1 className="text-ink max-w-3xl text-3xl leading-snug font-bold tracking-tight sm:text-5xl sm:leading-tight">
            거리와 차종만 고르면
            <br />
            운임부터 배차까지 바로 끝납니다
          </h1>

          <p className="text-muted max-w-2xl text-base leading-relaxed sm:text-lg">
            전화 흥정 없이 기준 단가로 오더를 올리고, 운송이 끝나면 미리 결제해 둔 운임을 정해진
            기준대로 바로 정산합니다. 화주와 차주 모두 진행 상황을 같은 화면에서 확인할 수 있습니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={primaryHref}
            className="bg-primary hover:bg-primary-dark inline-flex min-h-12 items-center justify-center rounded-md px-6 text-base font-semibold text-white transition-colors"
          >
            {primaryLabel}
          </Link>
          <a
            href="#features"
            className="border-line-strong text-ink inline-flex min-h-12 items-center justify-center rounded-md border bg-white px-6 text-base font-semibold transition-colors hover:bg-slate-50"
          >
            기능 살펴보기
          </a>
        </div>

        <dl className="border-line grid grid-cols-1 gap-6 border-t pt-8 sm:grid-cols-3">
          {HERO_METRICS.map((metric) => (
            <div key={metric.label} className="flex flex-col gap-1.5">
              <dt className="text-subtle text-xs font-medium">{metric.label}</dt>
              <dd className="text-ink text-xl font-bold tracking-tight sm:text-2xl">
                <MetricValue parts={metric.parts} />
              </dd>
              <p className="text-muted text-xs leading-relaxed sm:text-sm">{metric.desc}</p>
            </div>
          ))}
        </dl>
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

// 문제 정의 섹션: 현장에서 겪는 불편함 2가지와 해결 기준을 구체적으로 보여 준다.
function ProblemSection() {
  const { elementRef, isVisible } = useScrollReveal();

  return (
    <section id="problem" ref={elementRef} className="bg-white py-20 sm:py-28">
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

        <div className="bg-ink flex flex-col items-center justify-between gap-4 rounded-xl px-6 py-7 text-center text-white sm:flex-row sm:px-10 sm:text-left">
          <div className="flex flex-col gap-1">
            <p className="text-base font-bold sm:text-xl">
              운임 계산부터 정산까지 한 화면에서 차례대로 처리할 수 있습니다.
            </p>
            <p className="text-xs text-slate-300 sm:text-sm">
              오더 등록과 배차 수락, 상태 변경 이력이 빠짐없이 남아 분쟁 없이 정산됩니다.
            </p>
          </div>
          <a
            href="#features"
            className="bg-primary hover:bg-primary-dark inline-flex min-h-11 shrink-0 items-center justify-center rounded-md px-5 text-sm font-semibold text-white"
          >
            기능 보기
          </a>
        </div>
      </div>
    </section>
  );
}

// 추천 운임 즉시 계산기 패널(1번 탭).
function FareSimulatorPanel() {
  const [routeId, setRouteId] = useState(ROUTE_PRESETS[0].id);
  const [vehicleCode, setVehicleCode] = useState(VEHICLE_RATES[2].code);
  const [selectedSurcharges, setSelectedSurcharges] = useState([]);

  const selectedRoute = ROUTE_PRESETS.find((item) => item.id === routeId) ?? ROUTE_PRESETS[0];
  const selectedVehicle =
    VEHICLE_RATES.find((item) => item.code === vehicleCode) ?? VEHICLE_RATES[2];
  const estimate = calculateSimulatedFare(selectedRoute, selectedVehicle, selectedSurcharges);

  const toggleSurcharge = (code) => {
    setSelectedSurcharges((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code],
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-caption text-subtle font-medium">운송 구간</span>
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
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-caption text-subtle font-medium">차량 톤수</span>
        <div className="grid grid-cols-5 gap-1.5">
          {VEHICLE_RATES.map((vehicle) => {
            const isSelected = vehicle.code === vehicleCode;
            return (
              <button
                key={vehicle.code}
                type="button"
                onClick={() => setVehicleCode(vehicle.code)}
                className={`min-h-11 rounded-md border px-2 py-1.5 text-center text-xs font-semibold transition-colors sm:text-sm ${
                  isSelected
                    ? 'border-ink bg-ink text-white'
                    : 'border-line-strong text-copy bg-white hover:bg-slate-50'
                }`}
              >
                <span className="font-num">{vehicle.number}</span>
                {vehicle.unit}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-caption text-subtle font-medium">추가 할증 조건</span>
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

// 5단계 오더 및 정산 상태 프리뷰 패널(2번 탭).
function LifecyclePreviewPanel() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const currentStep = ORDER_LIFECYCLE_STEPS[activeStepIndex];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-caption inline-flex min-h-6 items-center rounded-sm px-2.5 font-semibold whitespace-nowrap ${currentStep.badgeClass}`}
        >
          {currentStep.badgeLabel}
        </span>
        <span className="bg-primary-soft text-ink text-caption inline-flex min-h-6 items-center rounded-sm px-2.5 font-semibold whitespace-nowrap">
          {currentStep.paymentLabel}
        </span>
      </div>

      <div className="border-line flex flex-wrap items-baseline justify-between gap-2 border-b pb-5">
        <div className="text-ink flex items-center gap-2 text-lg font-bold sm:text-xl">
          <span>서울 강서구</span>
          <span className="text-primary">→</span>
          <span>부산 강서구</span>
        </div>
        <span className="text-fare text-ink font-bold">
          <span className="font-num">830,000</span>원
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2" role="tablist" aria-label="오더 진행 단계 미리보기">
        {ORDER_LIFECYCLE_STEPS.map((item, index) => {
          const isCurrent = index === activeStepIndex;
          const isCompleted = index < activeStepIndex;
          const barClass = isCurrent ? 'bg-signal' : isCompleted ? 'bg-primary' : 'bg-slate-200';
          return (
            <button
              key={item.step}
              type="button"
              role="tab"
              aria-selected={isCurrent}
              onClick={() => setActiveStepIndex(index)}
              className="flex min-h-12 flex-col justify-center gap-2 rounded-md px-1 text-left hover:bg-slate-50"
            >
              <span className={`h-2 w-full rounded-full transition-colors ${barClass}`} />
              <span
                className={`text-caption truncate font-medium ${isCurrent ? 'text-ink font-bold' : 'text-subtle'}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <p className="border-line bg-ground/60 text-copy rounded-lg border p-4 text-sm leading-relaxed">
        {currentStep.summary}
      </p>
    </div>
  );
}

// 차종별 배차 및 주소 보호 프리뷰 패널(3번 탭).
function MatchingPreviewPanel() {
  return (
    <div className="flex flex-col gap-5">
      <div className="border-line flex items-center justify-between border-b pb-4">
        <span className="text-ink text-base font-bold">차종별 배차와 정보 보호 기준</span>
        <span className="bg-status-assigned text-status-assigned-ink text-caption rounded-sm px-2.5 py-1 font-semibold">
          중복 수락 방지
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {MATCHING_ITEMS.map((item) => (
          <div key={item.title} className="border-line bg-ground/60 rounded-lg border p-4">
            <div className="text-ink text-sm font-bold sm:text-base">{item.title}</div>
            <p className="text-muted mt-1 text-sm leading-relaxed">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 운임 선결제 정산 및 분쟁 처리 프리뷰 패널(4번 탭).
function SettlementPreviewPanel() {
  return (
    <div className="flex flex-col gap-5">
      <div className="border-line flex items-center justify-between border-b pb-4">
        <span className="text-ink text-base font-bold">선결제 보관과 자동 정산 기준</span>
        <span className="bg-status-completed text-status-completed-ink text-caption rounded-sm px-2.5 py-1 font-semibold">
          <span className="font-num">24</span>시간 자동 확인
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {SETTLEMENT_ITEMS.map((item) => (
          <div key={item.title} className="border-line bg-ground/60 rounded-lg border p-4">
            <div className="text-ink text-sm font-bold sm:text-base">{item.title}</div>
            <p className="text-muted mt-1 text-sm leading-relaxed">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 선택된 탭에 맞는 단일 프리뷰 패널을 반환한다.
function renderShowcasePanel(activeTab) {
  if (activeTab === 'fare') return <FareSimulatorPanel />;
  if (activeTab === 'lifecycle') return <LifecyclePreviewPanel />;
  if (activeTab === 'matching') return <MatchingPreviewPanel />;
  return <SettlementPreviewPanel />;
}

// 주요 기능 섹션: 좌측 4개 탭과 우측 단일 인터랙티브 패널을 배치한다.
function FeatureShowcaseSection() {
  const [activeTab, setActiveTab] = useState(FEATURE_TABS[0].id);
  const { elementRef, isVisible } = useScrollReveal();

  return (
    <section id="features" ref={elementRef} className="bg-ground py-20 sm:py-28">
      <div
        className={`mx-auto flex max-w-280 flex-col gap-10 px-4 sm:px-6 ${revealClass(isVisible)}`}
      >
        <div className="flex flex-col gap-3">
          <h2 className="text-ink text-2xl font-bold sm:text-4xl">주요 기능</h2>
          <p className="text-muted max-w-2xl text-sm sm:text-base">
            왼쪽 항목을 눌러 운임 계산부터 배차 기준, 상태 추적, 정산 처리 방식까지 직접 확인해
            보세요.
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-2" role="tablist" aria-label="주요 기능 선택">
            {FEATURE_TABS.map((tab) => {
              const isSelected = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col gap-1.5 rounded-xl border p-4 text-left transition-all ${
                    isSelected
                      ? 'border-ink bg-white shadow-sm'
                      : 'border-transparent bg-transparent hover:bg-white/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`font-num text-sm font-bold ${
                        isSelected ? 'text-primary' : 'text-subtle'
                      }`}
                    >
                      {tab.number}
                    </span>
                    <span
                      className={`text-base font-bold ${isSelected ? 'text-ink' : 'text-muted'}`}
                    >
                      {tab.title}
                    </span>
                  </div>
                  <p className="text-muted text-xs leading-relaxed sm:text-sm">{tab.desc}</p>
                </button>
              );
            })}
          </div>

          <div
            key={activeTab}
            className="border-line animate-fade-up rounded-2xl border bg-white p-6 shadow-sm sm:p-8"
          >
            {renderShowcasePanel(activeTab)}
          </div>
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
        <FeatureShowcaseSection />
      </main>
      <LandingFooter me={me} />
    </div>
  );
}

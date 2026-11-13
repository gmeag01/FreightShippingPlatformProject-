import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROLE_HOME, ROLE_LABEL } from '../auth/roles';
import { useAuth } from '../auth/useAuth';
import { formatNumber } from '../order/presentation';

// 상단 헤더 및 우측 플로팅 퀵 메뉴에서 사용하는 섹션 앵커 목록.
const SECTION_LINKS = [
  { id: 'problem', label: '문제 정의', shortLabel: '문제' },
  { id: 'features', label: '핵심 기능', shortLabel: '기능' },
  { id: 'architecture', label: '플랫폼 구조', shortLabel: '구조' },
  { id: 'experience', label: '1초 체험', shortLabel: '체험' },
];

const HERO_METRICS = [
  { label: '지원 차종', value: '1톤 ~ 25톤' },
  { label: '대금 보호', value: '100% 에스크로' },
  { label: '정산 기준', value: '24시간 자동 확정' },
];

// 기존 화물 중개 시장의 대표적인 비효율 2가지.
const PAIN_POINTS = [
  {
    number: '01',
    title: '기준 없는 깜깜이 운임',
    summary:
      '주선사·시간대마다 달라지는 호가로 인해 화주는 적정 비용을, 차주는 정당한 수익을 알기 어렵습니다.',
    points: ['거리·톤수 기준 단가 부재', '야간·수작업 할증 불투명'],
  },
  {
    number: '02',
    title: '분절된 배차·정산 소통',
    summary:
      '전화·메신저로 배차를 확인하는 사이 중복 수락이 발생하고, 운송 후 정산 지연과 분쟁에 노출됩니다.',
    points: ['동시 수락 충돌과 배차 번복', '정산 대기 및 이력 증빙 누락'],
  },
];

// 컨트롤타워 쇼케이스 좌측 4개 탭 메타데이터.
const CONTROL_TOWER_TABS = [
  {
    id: 'fare',
    number: '01',
    title: '추천 운임 자동 산정',
    subtitle: '구간 거리·차종·할증 조건을 반영해 즉시 기준 운임을 계산합니다.',
  },
  {
    id: 'lifecycle',
    number: '02',
    title: '5단계 실시간 운송·에스크로',
    subtitle: '등록부터 완료까지 오더와 운임 보관 상태를 한 흐름으로 추적합니다.',
  },
  {
    id: 'matching',
    number: '03',
    title: '차종 맞춤 배차·동시 수락 제어',
    subtitle: '차량 톤수에 맞는 오더만 노출하고 낙관적 락으로 중복 수락을 막습니다.',
  },
  {
    id: 'settlement',
    number: '04',
    title: '24시간 자동 정산·분쟁 관제',
    subtitle: '수령 확인 즉시 지급하며 미확인 시 24시간 후 자동 정산 및 분쟁을 중재합니다.',
  },
];

// 5단계 오더 및 에스크로 상태 프리뷰 목록.
const ORDER_LIFECYCLE_STEPS = [
  {
    step: 1,
    label: '등록·보관',
    badgeLabel: '등록됨',
    badgeClass: 'bg-status-registered text-status-registered-ink',
    escrowLabel: '운임 보관중',
    summary: '화주가 운임을 결제하면 플랫폼 에스크로 계좌가 대금을 안전하게 보관합니다.',
  },
  {
    step: 2,
    label: '배차완료',
    badgeLabel: '배차완료',
    badgeClass: 'bg-status-assigned text-status-assigned-ink',
    escrowLabel: '운임 보관중',
    summary: '적합 차종의 차주가 수락하면 배차가 확정되고 상·하차 상세주소가 열립니다.',
  },
  {
    step: 3,
    label: '운송중',
    badgeLabel: '운송중',
    badgeClass: 'bg-status-transit text-status-transit-ink',
    escrowLabel: '운임 보관중',
    summary: '상차 완료 후 목적지까지 운송하며 모든 상태 변경 시각과 행위자가 기록됩니다.',
  },
  {
    step: 4,
    label: '수령대기',
    badgeLabel: '수령확인대기',
    badgeClass: 'bg-status-awaiting text-status-awaiting-ink',
    escrowLabel: '정산 대기',
    summary: '하차 완료 후 화주의 수령 확인을 대기하며, 이상 시 분쟁 신고가 가능합니다.',
  },
  {
    step: 5,
    label: '정산완료',
    badgeLabel: '운송완료',
    badgeClass: 'bg-status-completed text-status-completed-ink',
    escrowLabel: '차주 지급완료',
    summary: '수령 확인 즉시(또는 24시간 경과 시 자동) 보관하던 운임을 차주에게 지급합니다.',
  },
];

// 추천 운임 시뮬레이터 구간 프리셋(시·구 및 추정 거리).
const ROUTE_PRESETS = [
  { id: 'seoul-busan', pickup: '서울 강서구', dropoff: '부산 강서구', distanceKm: 325 },
  { id: 'incheon-daejeon', pickup: '인천 서구', dropoff: '대전 유성구', distanceKm: 140 },
  { id: 'pyeongtaek-gwangju', pickup: '경기 평택시', dropoff: '광주 광산구', distanceKm: 260 },
  { id: 'seoul-icheon', pickup: '서울 금천구', dropoff: '경기 이천시', distanceKm: 55 },
];

// 설계 문서 4장 기준 차종별 기본요금 및 km당 단가.
const VEHICLE_RATES = [
  { code: 'TON_1', label: '1톤', maxLoadLabel: '1,000kg', baseFare: 30000, perKmFare: 1000 },
  { code: 'TON_2_5', label: '2.5톤', maxLoadLabel: '2,500kg', baseFare: 50000, perKmFare: 1400 },
  { code: 'TON_5', label: '5톤', maxLoadLabel: '5,000kg', baseFare: 80000, perKmFare: 1900 },
  { code: 'TON_11', label: '11톤', maxLoadLabel: '11,000kg', baseFare: 130000, perKmFare: 2600 },
  { code: 'TON_25', label: '25톤', maxLoadLabel: '25,000kg', baseFare: 200000, perKmFare: 3500 },
];

// 설계 문서 4장 기준 할증 조건 4종.
const SURCHARGE_OPTIONS = [
  { code: 'NIGHT', label: '야간 +20%', rate: 0.2 },
  { code: 'WEEKEND', label: '주말 +10%', rate: 0.1 },
  { code: 'MANUAL_LOADING', label: '수작업 +15%', rate: 0.15 },
  { code: 'URGENT', label: '긴급 +30%', rate: 0.3 },
];

// 설계 문서 4장: 1,000원 단위 반올림 단위.
const FARE_ROUNDING_UNIT = 1000;

// 차종 맞춤 배차 및 동시 수락 제어 카드 프리뷰 데이터.
const MATCHING_GUARDS = [
  { label: '차종·적재중량 필터', value: '보유 차량 톤수 이하·동일 오더만 자동 노출' },
  { label: '동시 수락 제어', value: 'Order @Version 낙관적 락으로 선착순 1명만 배차' },
  { label: '개인정보·주소 보호', value: '배차 전 시/구만 공개, 수락 확정 후 상세주소 열람' },
];

// 정산 및 분쟁 관제 카드 프리뷰 데이터.
const SETTLEMENT_RULES = [
  {
    label: '에스크로 선결제 보관',
    detail: '오더 등록과 동시에 운임을 플랫폼이 예치해 미지급을 차단합니다.',
  },
  {
    label: '24시간 자동 수령 확인',
    detail: '하차 완료 후 화주 무응답 시 스케줄러가 24시간 뒤 자동 정산합니다.',
  },
  {
    label: '관리자 분쟁 판결 관제',
    detail: '분쟁 접수 시 상태 이력과 연락처를 대조해 지급 또는 환불을 확정합니다.',
  },
];

// 플랫폼 3주체 아키텍처 카드 목록.
const ARCHITECTURE_PILLARS = [
  {
    number: '01',
    role: '화주 (SHIPPER)',
    title: '투명한 운임 산정과 안심 의뢰',
    summary: '거리와 차종만으로 추천 운임을 확인하고, 에스크로 보관으로 안전하게 화물을 보냅니다.',
    features: [
      '추천 운임 즉시 조회',
      '운송 상태 5단계 실시간 확인',
      '이상 시 분쟁 신고 및 이력 조회',
    ],
    to: '/signup?role=SHIPPER',
    ctaLabel: '화주로 시작하기',
  },
  {
    number: '02',
    role: '차주 (DRIVER)',
    title: '내 차에 맞는 오더와 확실한 정산',
    summary: '보유 차량 톤수에 맞는 의뢰만 골라 수락하고, 운송 완료 후 지연 없이 정산받습니다.',
    features: [
      '차종 맞춤 일감 필터링',
      '낙관적 락 기반 안정적 수락',
      '수령 확인 즉시·24시간 자동 정산',
    ],
    to: '/signup?role=DRIVER',
    ctaLabel: '차주로 시작하기',
  },
  {
    number: '03',
    role: '관제 컨트롤타워 (ADMIN)',
    title: '단가·오더·분쟁의 단일 운영 관제',
    summary: '운임 단가표와 할증률 설정부터 당일 배차 현황, 분쟁 판결과 회원 상태까지 통제합니다.',
    features: [
      '일일 등록·배차·완료 대시보드',
      '분쟁 대기 및 과거 판결 이력 관제',
      '차종별 단가·할증 정책 실시간 관리',
    ],
    to: '/login',
    ctaLabel: '관리자 로그인',
  },
];

// 로컬 시드 계정 빠른 체험 목록(data.sql 기준).
const DEMO_ACCOUNTS = [
  {
    role: 'SHIPPER',
    label: '화주 1초 체험',
    desc: '오더 등록·추천 운임·수령 확인',
    email: 'shipper1@freight.test',
  },
  {
    role: 'DRIVER',
    label: '차주 1초 체험',
    desc: '오더 수락·운송 진행·정산 조회',
    email: 'driver1@freight.test',
  },
  {
    role: 'ADMIN',
    label: '관리자 1초 체험',
    desc: '대시보드·분쟁 관제·단가 관리',
    email: 'admin@freight.test',
  },
];

// 설계 문서 4장의 추천 운임 공식에 따라 기본·거리·할증·총액을 계산한다.
function calculateSimulatedFare(route, vehicleRate, selectedSurcharges) {
  const baseFare = vehicleRate.baseFare;
  const distanceFare = route.distanceKm * vehicleRate.perKmFare;
  const surchargeRateSum = SURCHARGE_OPTIONS.filter((item) =>
    selectedSurcharges.includes(item.code),
  ).reduce((sum, item) => sum + item.rate, 0);
  const rawTotal = (baseFare + distanceFare) * (1 + surchargeRateSum);
  const recommendedFare = Math.round(rawTotal / FARE_ROUNDING_UNIT) * FARE_ROUNDING_UNIT;
  const surchargeAmount = Math.max(0, recommendedFare - (baseFare + distanceFare));
  return { baseFare, distanceFare, surchargeAmount, recommendedFare };
}

// 스크롤 시 요소가 화면에 진입하면 한 번만 노출 상태를 true로 전환하는 훅.
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

// 스크롤 노출 여부에 따라 페이드업 클래스를 돌려준다.
function revealClass(isVisible) {
  return isVisible
    ? 'translate-y-0 opacity-100 transition-all duration-700 ease-out'
    : 'translate-y-8 opacity-0 transition-all duration-700 ease-out';
}

// 상단 고정 머리말: 브랜드 로고, 섹션 이동 링크, 로그인·회원가입 버튼을 배치한다.
function LandingHeader({ me, onLogout }) {
  return (
    <header className="bg-ink/95 sticky top-0 z-30 border-b border-white/10 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-280 items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <span className="bg-signal h-5 w-1 rounded-full" aria-hidden="true" />
          <strong className="text-base font-bold tracking-tight text-white sm:text-lg">
            화물운송플랫폼
          </strong>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="페이지 주요 섹션">
          {SECTION_LINKS.map((linkItem) => (
            <a
              key={linkItem.id}
              href={`#${linkItem.id}`}
              className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
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

// 헤더 우측 인증 상태별 버튼 묶음.
function HeaderAuthActions({ me, onLogout }) {
  if (me) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden items-center rounded-sm bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200 sm:inline-flex">
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
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-white/25 px-3 text-sm font-semibold whitespace-nowrap text-slate-200 hover:bg-white/10"
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
        className="inline-flex min-h-10 items-center justify-center rounded-md border border-white/25 px-3.5 text-sm font-semibold whitespace-nowrap text-white hover:bg-white/10"
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

// 데스크톱 우측에 고정되어 주요 섹션으로 바로 이동하는 플로팅 퀵 메뉴.
function FloatingQuickNav() {
  return (
    <aside
      aria-label="빠른 섹션 이동"
      className="fixed top-1/2 right-5 z-30 hidden -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 shadow-lg backdrop-blur-sm xl:flex"
    >
      {SECTION_LINKS.map((item, index) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={`text-ink hover:bg-primary-soft hover:text-primary flex h-12 w-14 flex-col items-center justify-center text-xs font-semibold transition-colors ${
            index > 0 ? 'border-t border-slate-100' : ''
          }`}
        >
          <span>{item.shortLabel}</span>
        </a>
      ))}
    </aside>
  );
}

// 풀와이드 다크 네이비 히어로 배너: 서비스 정체성과 핵심 지표, 주요 CTA를 배치한다.
function HeroBannerSection({ me }) {
  const primaryHref = me ? ROLE_HOME[me.role] : '/signup';
  const primaryLabel = me ? '내 화면으로 이동' : '무료로 시작하기';

  return (
    <section className="bg-ink relative overflow-hidden py-20 text-white sm:py-28">
      <div className="mx-auto flex max-w-280 flex-col gap-8 px-4 sm:px-6">
        <div className="flex flex-col gap-5">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold tracking-wider text-blue-200">
            <span className="bg-signal h-2 w-2 rounded-full" aria-hidden="true" />
            FREIGHT CONTROL TOWER
          </span>

          <h1 className="max-w-3xl text-3xl leading-snug font-bold tracking-tight sm:text-5xl sm:leading-tight">
            화물 운송의 전 과정을 한눈에,
            <br />
            하나의 컨트롤타워로
          </h1>

          <p className="max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            추천 운임 산정부터 차종 맞춤 배차, 에스크로 대금 보관, 24시간 자동 정산과 분쟁 관제까지
            화주와 차주의 모든 운송 흐름을 끊김 없이 연결합니다.
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
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/25 px-6 text-base font-semibold text-white transition-colors hover:bg-white/10"
          >
            핵심 기능 살펴보기
          </a>
          <a
            href="#experience"
            className="text-signal-soft hover:text-signal inline-flex min-h-12 items-center justify-center px-3 text-sm font-semibold underline-offset-4 hover:underline"
          >
            시드 계정으로 1초 체험 →
          </a>
        </div>

        <dl className="grid grid-cols-1 gap-6 border-t border-white/15 pt-8 sm:grid-cols-3">
          {HERO_METRICS.map((metric) => (
            <div key={metric.label} className="flex flex-col gap-1">
              <dt className="text-xs font-medium text-slate-400">{metric.label}</dt>
              <dd className="text-xl font-bold tracking-tight text-white tabular-nums sm:text-2xl">
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

// 스크롤 진입 시 선이 그려지는 손글씨 스타일 원형 SVG 강조 요소.
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

// 문제 정의 섹션: 기존 화물 중개의 2가지 핵심 병목과 플랫폼의 해결 메시지를 대비해 보여 준다.
function ProblemSection() {
  const { elementRef, isVisible } = useScrollReveal();

  return (
    <section id="problem" ref={elementRef} className="bg-white py-20 sm:py-28">
      <div
        className={`mx-auto flex max-w-280 flex-col gap-12 px-4 sm:px-6 ${revealClass(isVisible)}`}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-primary text-xs font-bold tracking-widest uppercase">
            WHY CONTROL TOWER
          </span>
          <h2 className="text-ink text-2xl font-bold sm:text-4xl">
            혹시 운송 과정에서 이런{' '}
            <span className="relative inline-block px-2">
              <span className="relative z-10">어려움</span>
              <ScribbleCircleSvg isVisible={isVisible} />
            </span>{' '}
            을 겪고 계신가요?
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {PAIN_POINTS.map((item) => (
            <article
              key={item.number}
              className="border-line bg-ground/50 flex flex-col gap-4 rounded-xl border p-6 sm:p-8"
            >
              <div className="flex items-center gap-3">
                <span className="bg-ink flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold text-white">
                  {item.number}
                </span>
                <h3 className="text-ink text-lg font-bold sm:text-xl">{item.title}</h3>
              </div>
              <p className="text-muted text-sm leading-relaxed sm:text-base">{item.summary}</p>
              <ul className="border-line flex flex-col gap-2 border-t pt-4">
                {item.points.map((point) => (
                  <li key={point} className="text-copy flex items-center gap-2 text-sm font-medium">
                    <span className="bg-signal h-1.5 w-1.5 rounded-full" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="bg-ink flex flex-col items-center justify-between gap-4 rounded-xl px-6 py-7 text-center text-white sm:flex-row sm:px-10 sm:text-left">
          <p className="text-base font-bold sm:text-xl">
            복잡했던 화물 중개, <span className="text-blue-300">화물운송플랫폼</span>이 하나의
            흐름으로 해결합니다.
          </p>
          <a
            href="#features"
            className="bg-primary hover:bg-primary-dark inline-flex min-h-11 shrink-0 items-center justify-center rounded-md px-5 text-sm font-semibold text-white"
          >
            해결 방식 보기
          </a>
        </div>
      </div>
    </section>
  );
}

// 추천 운임 즉시 계산기 패널(쇼케이스 1번 탭).
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
        <span className="text-caption text-subtle font-medium">구간 선택</span>
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
                <span
                  className={`text-caption tabular-nums ${isSelected ? 'text-slate-300' : 'text-subtle'}`}
                >
                  {route.distanceKm}km
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-caption text-subtle font-medium">차종 선택</span>
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
                {vehicle.label}
              </button>
            );
          })}
        </div>
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
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="border-line bg-ground/70 flex flex-wrap items-end justify-between gap-4 rounded-lg border p-5">
        <div className="flex flex-col gap-1">
          <span className="text-caption text-subtle">예상 추천 운임 (1,000원 단위 반올림)</span>
          <strong className="text-fare-lg text-ink font-bold tabular-nums">
            {formatNumber(estimate.recommendedFare)}원
          </strong>
        </div>
        <dl className="text-muted flex gap-4 text-xs tabular-nums sm:text-sm">
          <div>
            <dt className="inline">기본 </dt>
            <dd className="text-ink inline font-semibold">{formatNumber(estimate.baseFare)}원</dd>
          </div>
          <div>
            <dt className="inline">거리 </dt>
            <dd className="text-ink inline font-semibold">
              {formatNumber(estimate.distanceFare)}원
            </dd>
          </div>
          <div>
            <dt className="inline">할증 </dt>
            <dd className="text-ink inline font-semibold">
              {formatNumber(estimate.surchargeAmount)}원
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

// 5단계 오더 및 에스크로 상태 프리뷰 패널(쇼케이스 2번 탭).
function LifecyclePreviewPanel() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const currentStep = ORDER_LIFECYCLE_STEPS[activeStepIndex];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-caption text-muted font-mono">ORDER #10482</span>
          <span
            className={`text-caption inline-flex min-h-6 items-center rounded-sm px-2.5 font-semibold whitespace-nowrap ${currentStep.badgeClass}`}
          >
            {currentStep.badgeLabel}
          </span>
        </div>
        <span className="bg-primary-soft text-ink text-caption inline-flex min-h-6 items-center rounded-sm px-2.5 font-semibold whitespace-nowrap">
          {currentStep.escrowLabel}
        </span>
      </div>

      <div className="border-line flex flex-wrap items-baseline justify-between gap-2 border-b pb-5">
        <div className="text-ink flex items-center gap-2 text-lg font-bold sm:text-xl">
          <span>서울 강서구</span>
          <span className="text-primary">→</span>
          <span>부산 강서구</span>
        </div>
        <span className="text-fare text-ink font-bold tabular-nums">830,000원</span>
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

// 차종 맞춤 배차 및 동시 수락 제어 프리뷰 패널(쇼케이스 3번 탭).
function MatchingPreviewPanel() {
  return (
    <div className="flex flex-col gap-5">
      <div className="border-line flex items-center justify-between border-b pb-4">
        <span className="text-ink text-base font-bold">안전한 배차 수락 매커니즘</span>
        <span className="bg-status-assigned text-status-assigned-ink text-caption rounded-sm px-2.5 py-1 font-semibold">
          동시 수락 충돌 방지
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {MATCHING_GUARDS.map((guard) => (
          <div key={guard.label} className="border-line bg-ground/60 rounded-lg border p-4">
            <div className="text-primary text-xs font-bold">{guard.label}</div>
            <div className="text-ink mt-1 text-sm font-semibold sm:text-base">{guard.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 24시간 자동 정산 및 분쟁 관제 프리뷰 패널(쇼케이스 4번 탭).
function SettlementPreviewPanel() {
  return (
    <div className="flex flex-col gap-5">
      <div className="border-line flex items-center justify-between border-b pb-4">
        <span className="text-ink text-base font-bold">에스크로 정산 · 분쟁 관제 체계</span>
        <span className="bg-status-completed text-status-completed-ink text-caption rounded-sm px-2.5 py-1 font-semibold">
          자동 확정 스케줄러 가동
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {SETTLEMENT_RULES.map((rule) => (
          <div key={rule.label} className="border-line bg-ground/60 rounded-lg border p-4">
            <div className="text-ink text-sm font-bold sm:text-base">{rule.label}</div>
            <p className="text-muted mt-1 text-sm leading-relaxed">{rule.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 선택된 탭 ID에 맞는 단일 쇼케이스 패널을 돌려준다.
function renderShowcasePanel(activeTab) {
  if (activeTab === 'fare') return <FareSimulatorPanel />;
  if (activeTab === 'lifecycle') return <LifecyclePreviewPanel />;
  if (activeTab === 'matching') return <MatchingPreviewPanel />;
  return <SettlementPreviewPanel />;
}

// 컨트롤타워 핵심 기능 쇼케이스: 좌측 4개 수직 탭과 우측 단일 인터랙티브 패널을 배치한다.
function FeatureShowcaseSection() {
  const [activeTab, setActiveTab] = useState(CONTROL_TOWER_TABS[0].id);
  const { elementRef, isVisible } = useScrollReveal();

  return (
    <section id="features" ref={elementRef} className="bg-ground py-20 sm:py-28">
      <div
        className={`mx-auto flex max-w-280 flex-col gap-10 px-4 sm:px-6 ${revealClass(isVisible)}`}
      >
        <div className="flex flex-col gap-3">
          <span className="text-primary text-xs font-bold tracking-widest uppercase">
            CORE FEATURES
          </span>
          <h2 className="text-ink text-2xl font-bold sm:text-4xl">
            복잡했던 화물 운송, 하나의 컨트롤타워로
          </h2>
          <p className="text-muted max-w-2xl text-sm sm:text-base">
            원하는 기능을 선택해 화물운송플랫폼의 핵심 동작을 직접 눌러 확인해 보세요.
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-2" role="tablist" aria-label="컨트롤타워 핵심 기능">
            {CONTROL_TOWER_TABS.map((tab) => {
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
                      className={`text-xs font-bold tabular-nums ${
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
                  <p className="text-muted text-xs leading-relaxed sm:text-sm">{tab.subtitle}</p>
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

// 3주체 아키텍처 섹션: 화주·차주·관리자 컨트롤타워 역할을 번호형 3열 카드로 보여 준다.
function ArchitectureSection() {
  const { elementRef, isVisible } = useScrollReveal();

  return (
    <section id="architecture" ref={elementRef} className="bg-white py-20 sm:py-28">
      <div
        className={`mx-auto flex max-w-280 flex-col gap-12 px-4 sm:px-6 ${revealClass(isVisible)}`}
      >
        <div className="flex flex-col gap-3">
          <span className="text-primary text-xs font-bold tracking-widest uppercase">
            PLATFORM ARCHITECTURE
          </span>
          <h2 className="text-ink text-2xl font-bold sm:text-4xl">
            화주·차주·관리자가 연결되는 3단 구조
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {ARCHITECTURE_PILLARS.map((pillar) => (
            <article
              key={pillar.number}
              className="border-line flex flex-col justify-between gap-6 rounded-2xl border bg-white p-6 transition-shadow hover:shadow-md sm:p-7"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-primary text-3xl font-bold tracking-tight tabular-nums">
                    {pillar.number}
                  </span>
                  <span className="bg-ground text-ink rounded-sm px-2.5 py-1 text-xs font-semibold">
                    {pillar.role}
                  </span>
                </div>
                <h3 className="text-ink text-lg font-bold">{pillar.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{pillar.summary}</p>
                <ul className="border-line flex flex-col gap-2 border-t pt-4">
                  {pillar.features.map((feature) => (
                    <li key={feature} className="text-copy flex items-center gap-2 text-sm">
                      <span className="bg-primary h-1.5 w-1.5 rounded-full" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                to={pillar.to}
                className="border-line-strong text-ink inline-flex min-h-11 items-center justify-center rounded-md border bg-white px-4 text-sm font-semibold transition-colors hover:bg-slate-50"
              >
                {pillar.ctaLabel}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// 하단 다크 풀와이드 체험 및 가입 유도 섹션 + 시드 계정 1초 체험 버튼.
function ExperienceCtaSection({ onQuickLogin, quickLoginRole, quickLoginError }) {
  return (
    <section id="experience" className="bg-ink py-20 text-white sm:py-24">
      <div className="mx-auto flex max-w-280 flex-col gap-10 px-4 sm:px-6">
        <div className="flex flex-col gap-4 text-center sm:text-left">
          <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">
            화물 운송, 고민하지 마세요.
            <br />
            지금 바로 경험해 보세요.
          </h2>
          <p className="text-sm text-slate-300 sm:text-base">
            별도 가입 절차 없이 시드 계정으로 화주·차주·관리자 컨트롤타워 화면을 바로 확인할 수
            있습니다.
          </p>
        </div>

        {quickLoginError && (
          <p className="bg-danger-soft text-danger rounded-md border border-red-200 px-4 py-3 text-sm font-medium">
            {quickLoginError}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.role}
              type="button"
              disabled={Boolean(quickLoginRole)}
              onClick={() => onQuickLogin(account)}
              className="flex flex-col items-start justify-between gap-3 rounded-xl border border-white/15 bg-white/10 p-5 text-left transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-base font-bold text-white">
                  {quickLoginRole === account.role ? '로그인 중…' : account.label}
                </span>
                <span className="text-blue-200">→</span>
              </div>
              <span className="text-xs text-slate-300">{account.desc}</span>
              <span className="font-mono text-xs text-slate-400">{account.email}</span>
            </button>
          ))}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-8 text-xs text-slate-400">
          <span>화물운송플랫폼 · 투명한 운임과 에스크로 정산 기반 화물 중개 컨트롤타워</span>
          <div className="flex gap-4">
            <Link to="/signup" className="text-slate-200 hover:text-white">
              회원가입
            </Link>
            <Link to="/login" className="text-slate-200 hover:text-white">
              로그인
            </Link>
          </div>
        </footer>
      </div>
    </section>
  );
}

// 로지스팟 컨트롤타워 레퍼런스 기반의 풀와이드 섹션 리듬을 갖춘 메인 랜딩페이지.
export default function LandingPage() {
  const { me, isLoading, login, logout } = useAuth();
  const navigate = useNavigate();
  const [quickLoginRole, setQuickLoginRole] = useState('');
  const [quickLoginError, setQuickLoginError] = useState('');

  if (isLoading) return null;

  const handleQuickLogin = async (account) => {
    setQuickLoginError('');
    setQuickLoginRole(account.role);
    try {
      const loggedInMember = await login(account.email, 'pass1234');
      navigate(ROLE_HOME[loggedInMember.role], { replace: true });
    } catch (error) {
      setQuickLoginError(error.message || '체험 계정 로그인에 실패했습니다.');
    } finally {
      setQuickLoginRole('');
    }
  };

  return (
    <div className="bg-ground text-copy min-h-screen break-keep">
      <LandingHeader me={me} onLogout={logout} />
      <FloatingQuickNav />
      <main>
        <HeroBannerSection me={me} />
        <ProblemSection />
        <FeatureShowcaseSection />
        <ArchitectureSection />
        <ExperienceCtaSection
          onQuickLogin={handleQuickLogin}
          quickLoginRole={quickLoginRole}
          quickLoginError={quickLoginError}
        />
      </main>
    </div>
  );
}

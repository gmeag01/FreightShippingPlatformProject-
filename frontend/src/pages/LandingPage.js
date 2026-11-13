import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROLE_HOME, ROLE_LABEL } from '../auth/roles';
import { useAuth } from '../auth/useAuth';
import { formatNumber } from '../order/presentation';

// 5단계 오더 및 에스크로 상태 프리뷰 목록.
const ORDER_LIFECYCLE_STEPS = [
  {
    step: 1,
    label: '등록·보관',
    badgeLabel: '등록됨',
    badgeClass: 'bg-status-registered text-status-registered-ink',
    escrowLabel: '운임 보관중',
    summary: '화주가 운임을 결제하면 플랫폼이 안전하게 보관합니다.',
  },
  {
    step: 2,
    label: '배차완료',
    badgeLabel: '배차완료',
    badgeClass: 'bg-status-assigned text-status-assigned-ink',
    escrowLabel: '운임 보관중',
    summary: '조건에 맞는 차주가 오더를 수락해 배차가 확정됩니다.',
  },
  {
    step: 3,
    label: '운송중',
    badgeLabel: '운송중',
    badgeClass: 'bg-status-transit text-status-transit-ink',
    escrowLabel: '운임 보관중',
    summary: '상차 완료 후 목적지까지 화물을 운송합니다.',
  },
  {
    step: 4,
    label: '수령대기',
    badgeLabel: '수령확인대기',
    badgeClass: 'bg-status-awaiting text-status-awaiting-ink',
    escrowLabel: '정산 대기',
    summary: '하차 완료 후 화주의 수령 확인을 기다립니다.',
  },
  {
    step: 5,
    label: '정산완료',
    badgeLabel: '운송완료',
    badgeClass: 'bg-status-completed text-status-completed-ink',
    escrowLabel: '차주 지급완료',
    summary: '수령 확인 즉시 보관하던 운임을 차주에게 지급합니다.',
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

// 로컬 시드 계정 빠른 체험 목록(data.sql 기준).
const DEMO_ACCOUNTS = [
  { role: 'SHIPPER', label: '화주 체험', email: 'shipper1@freight.test' },
  { role: 'DRIVER', label: '차주 체험', email: 'driver1@freight.test' },
  { role: 'ADMIN', label: '관리자 체험', email: 'admin@freight.test' },
];

const HERO_METRICS = [
  { label: '지원 차종', value: '1~25톤' },
  { label: '운임 보호', value: '100% 에스크로' },
  { label: '정산 기준', value: '24시간 자동 확인' },
];

const ROLE_CARDS = [
  {
    title: '화주',
    summary: '추천 운임 확인부터 안전한 정산까지',
    keywords: ['추천 운임 즉시 계산', '에스크로 안심 결제', '실시간 진행·분쟁 신고'],
    to: '/signup?role=SHIPPER',
    ctaLabel: '화주로 시작하기',
  },
  {
    title: '차주',
    summary: '내 차량에 맞는 의뢰만 골라 바로 수락',
    keywords: ['차종별 맞춤 의뢰 목록', '수령 확인 즉시 지급', '배차 후 상세주소 열람'],
    to: '/signup?role=DRIVER',
    ctaLabel: '차주로 시작하기',
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

// 공통 상단 머리말. 로그인 여부에 따라 인증 버튼 또는 내 화면 이동 버튼을 보여 준다.
function LandingHeader({ me, onLogout }) {
  return (
    <header className="bg-ink border-b border-blue-950/40">
      <div className="mx-auto flex h-[60px] max-w-280 items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
          <span className="bg-signal h-5 w-1 rounded-full" aria-hidden="true" />
          <strong className="text-base font-bold tracking-tight text-white sm:text-lg">
            화물운송플랫폼
          </strong>
        </Link>

        {me ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center rounded-sm bg-white/10 px-2 py-0.5 text-xs font-semibold text-slate-200 sm:inline-flex">
              {ROLE_LABEL[me.role]} · {me.name}
            </span>
            <Link
              to={ROLE_HOME[me.role]}
              className="bg-primary hover:bg-primary-dark inline-flex min-h-11 items-center justify-center rounded-md px-3.5 text-sm font-semibold whitespace-nowrap text-white"
            >
              내 화면으로
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/25 px-3 text-sm font-semibold whitespace-nowrap text-slate-200 hover:bg-white/10"
            >
              로그아웃
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/25 px-3.5 text-sm font-semibold whitespace-nowrap text-white hover:bg-white/10"
            >
              로그인
            </Link>
            <Link
              to="/signup"
              className="bg-primary hover:bg-primary-dark inline-flex min-h-11 items-center justify-center rounded-md px-3.5 text-sm font-semibold whitespace-nowrap text-white"
            >
              회원가입
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

// 5칸 진행 단계 바와 오더·에스크로 상태 프리뷰를 보여 주는 인터랙티브 카드.
function OrderLifecyclePreviewCard({ activeStepIndex, onSelectStep }) {
  const currentStep = ORDER_LIFECYCLE_STEPS[activeStepIndex];

  return (
    <div className="border-line bg-card flex flex-col gap-4 rounded-lg border p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-caption text-muted font-mono">#10482</span>
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

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-ink flex items-center gap-2 text-lg font-bold">
          <span>서울 강서구</span>
          <span className="flex items-center" aria-hidden="true">
            <span className="bg-primary h-2.5 w-2.5 rounded-full" />
            <span className="bg-line-strong h-0.5 w-8" />
            <span className="bg-ink h-2.5 w-2.5 rounded-xs" />
          </span>
          <span>부산 강서구</span>
        </div>
        <span className="text-fare text-ink font-bold tabular-nums">830,000원</span>
      </div>

      <div className="grid grid-cols-5 gap-1.5" role="tablist" aria-label="오더 진행 단계 미리보기">
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
              onClick={() => onSelectStep(index)}
              className="flex min-h-11 flex-col justify-center gap-1.5 rounded-md px-1 text-left hover:bg-slate-50"
            >
              <span className={`h-2 w-full rounded-full ${barClass}`} />
              <span
                className={`text-caption truncate font-medium ${isCurrent ? 'text-ink font-bold' : 'text-subtle'}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <p className="border-line text-muted border-t pt-3 text-sm">{currentStep.summary}</p>
    </div>
  );
}

// 첫 화면 히어로 영역: 간결한 가치 제안, 주요 진입 버튼, 인터랙티브 오더 상태 프리뷰.
function HeroSection({ me, activeStepIndex, onSelectStep }) {
  const primaryAction = me
    ? { to: ROLE_HOME[me.role], label: '내 화면으로 이동' }
    : { to: '/signup?role=SHIPPER', label: '화주로 시작하기' };
  const secondaryAction = me
    ? { to: '/login', label: '계정 전환' }
    : { to: '/signup?role=DRIVER', label: '차주로 시작하기' };

  return (
    <section className="grid items-center gap-6 lg:grid-cols-2 lg:gap-8">
      <div className="flex flex-col gap-4">
        <span className="bg-primary-soft text-primary text-caption inline-flex w-fit items-center rounded-sm border border-blue-200 px-2.5 py-1 font-semibold">
          에스크로 화물 중개 플랫폼
        </span>
        <h1 className="text-ink text-2xl leading-tight font-bold sm:text-3xl">
          투명한 추천 운임,
          <br />
          안전한 운송 정산
        </h1>
        <p className="text-muted text-sm sm:text-base">
          거리·차종 기반 추천 운임과 에스크로 보관으로 화주와 차주를 바로 연결합니다.
        </p>

        <div className="flex flex-wrap gap-2.5 pt-1">
          <Link
            to={primaryAction.to}
            className="bg-primary hover:bg-primary-dark inline-flex min-h-11 items-center justify-center rounded-md border border-transparent px-4.5 font-semibold whitespace-nowrap text-white"
          >
            {primaryAction.label}
          </Link>
          {!me && (
            <Link
              to={secondaryAction.to}
              className="border-line-strong text-copy inline-flex min-h-11 items-center justify-center rounded-md border bg-white px-4.5 font-semibold whitespace-nowrap hover:bg-slate-50"
            >
              {secondaryAction.label}
            </Link>
          )}
        </div>

        <dl className="border-line grid grid-cols-3 gap-3 border-t pt-4">
          {HERO_METRICS.map((metric) => (
            <div key={metric.label}>
              <dt className="text-caption text-subtle">{metric.label}</dt>
              <dd className="text-ink text-sm font-bold tabular-nums sm:text-base">
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <OrderLifecyclePreviewCard activeStepIndex={activeStepIndex} onSelectStep={onSelectStep} />
    </section>
  );
}

// 구간·차종·할증 선택 즉시 추천 운임을 계산해 보여 주는 인터랙티브 시뮬레이터.
function FarePreviewSection() {
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
    <section className="border-line bg-card flex flex-col gap-5 rounded-lg border p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-h2 text-ink font-bold">추천 운임 미리 계산</h2>
        <span className="text-caption text-subtle">구간·차종·할증 선택 시 즉시 계산</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-caption text-subtle font-medium">운송 구간</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                      {route.pickup.split(' ')[0]} → {route.dropoff.split(' ')[0]}
                    </span>
                    <span
                      className={`text-caption tabular-nums ${isSelected ? 'text-slate-200' : 'text-subtle'}`}
                    >
                      {route.distanceKm}km
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-caption text-subtle font-medium">차종</span>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {VEHICLE_RATES.map((vehicle) => {
                const isSelected = vehicle.code === vehicleCode;
                return (
                  <button
                    key={vehicle.code}
                    type="button"
                    onClick={() => setVehicleCode(vehicle.code)}
                    className={`min-h-11 rounded-md border px-3 py-1.5 text-center text-sm font-semibold transition-colors ${
                      isSelected
                        ? 'border-ink bg-ink text-white'
                        : 'border-line-strong text-copy bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="block">{vehicle.label}</span>
                    <span
                      className={`text-caption font-normal tabular-nums ${isSelected ? 'text-slate-200' : 'text-subtle'}`}
                    >
                      {vehicle.maxLoadLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-caption text-subtle font-medium">할증 조건</span>
            <div className="flex flex-wrap gap-2">
              {SURCHARGE_OPTIONS.map((option) => {
                const isSelected = selectedSurcharges.includes(option.code);
                return (
                  <button
                    key={option.code}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleSurcharge(option.code)}
                    className={`min-h-11 rounded-md border px-3.5 text-sm font-medium transition-colors ${
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
          </div>
        </div>

        <aside className="border-line bg-primary-soft/60 flex flex-col justify-between gap-4 rounded-lg border p-4">
          <div className="flex flex-col gap-2">
            <span className="text-caption text-subtle">예상 추천 운임</span>
            <strong className="text-fare-lg text-ink font-bold tabular-nums">
              {formatNumber(estimate.recommendedFare)}원
            </strong>
            <div className="text-ink flex items-center gap-1.5 text-sm font-medium">
              <span>{selectedRoute.pickup}</span>
              <span className="text-subtle">→</span>
              <span>{selectedRoute.dropoff}</span>
              <span className="text-caption text-subtle tabular-nums">
                ({selectedRoute.distanceKm}km)
              </span>
            </div>
          </div>

          <dl className="border-line flex flex-col gap-1.5 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">기본요금</dt>
              <dd className="text-ink font-medium tabular-nums">
                {formatNumber(estimate.baseFare)}원
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">거리요금</dt>
              <dd className="text-ink font-medium tabular-nums">
                {formatNumber(estimate.distanceFare)}원
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">할증금액</dt>
              <dd className="text-ink font-medium tabular-nums">
                {formatNumber(estimate.surchargeAmount)}원
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}

// 화주·차주 가입 안내 및 시드 계정 원클릭 체험 카드 영역.
function RoleEntrySection({ onQuickLogin, quickLoginRole, quickLoginError }) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {ROLE_CARDS.map((cardItem) => (
        <article
          key={cardItem.title}
          className="border-line bg-card flex flex-col justify-between gap-4 rounded-lg border p-4 sm:p-5"
        >
          <div className="flex flex-col gap-2">
            <h2 className="text-h2 text-ink font-bold">{cardItem.title}</h2>
            <p className="text-muted text-sm">{cardItem.summary}</p>
            <ul className="text-copy flex flex-col gap-1.5 pt-1 text-sm">
              {cardItem.keywords.map((keyword) => (
                <li key={keyword} className="flex items-center gap-2">
                  <span className="bg-primary h-1.5 w-1.5 rounded-full" aria-hidden="true" />
                  <span>{keyword}</span>
                </li>
              ))}
            </ul>
          </div>
          <Link
            to={cardItem.to}
            className="border-line-strong text-copy inline-flex min-h-11 items-center justify-center rounded-md border bg-white px-4 font-semibold whitespace-nowrap hover:bg-slate-50"
          >
            {cardItem.ctaLabel}
          </Link>
        </article>
      ))}

      <article className="border-line bg-card flex flex-col justify-between gap-4 rounded-lg border p-4 sm:p-5">
        <div className="flex flex-col gap-2">
          <h2 className="text-h2 text-ink font-bold">바로 체험하기</h2>
          <p className="text-muted text-sm">가입 없이 시드 계정으로 전체 흐름을 확인합니다.</p>
          {quickLoginError && (
            <p className="bg-danger-soft text-danger text-caption rounded-md border border-red-200 px-3 py-2 font-medium">
              {quickLoginError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.role}
              type="button"
              disabled={Boolean(quickLoginRole)}
              onClick={() => onQuickLogin(account)}
              className="border-line-strong text-ink inline-flex min-h-11 items-center justify-between rounded-md border bg-white px-3.5 text-sm font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              <span>{quickLoginRole === account.role ? '로그인 중…' : account.label}</span>
              <span className="text-caption text-subtle font-mono">{account.email}</span>
            </button>
          ))}
        </div>
      </article>
    </section>
  );
}

// 서비스 핵심 가치·운임 시뮬레이터·빠른 체험 로그인을 제공하는 메인 페이지.
export default function LandingPage() {
  const { me, isLoading, login, logout } = useAuth();
  const navigate = useNavigate();
  const [activeStepIndex, setActiveStepIndex] = useState(0);
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
      <main className="mx-auto flex max-w-280 flex-col gap-8 px-4 pt-8 pb-14 sm:px-6 sm:pt-10">
        <HeroSection me={me} activeStepIndex={activeStepIndex} onSelectStep={setActiveStepIndex} />
        <FarePreviewSection />
        <RoleEntrySection
          onQuickLogin={handleQuickLogin}
          quickLoginRole={quickLoginRole}
          quickLoginError={quickLoginError}
        />
      </main>
    </div>
  );
}

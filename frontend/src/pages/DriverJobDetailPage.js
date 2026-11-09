import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchMyJob } from '../api/jobs';
import JobActionDialogs, { JobBanner } from '../components/jobs/JobActionDialogs';
import {
  JobField,
  JobProgress,
  JobStatusBadge,
  JobStatusNotice,
  PRIMARY_BUTTON,
  RouteLine,
  SECONDARY_BUTTON,
} from '../components/jobs/JobCard';
import {
  JOB_ACTIONS,
  JOB_STATUS,
  PAYMENT_STATUS_LABELS,
  findCurrentStepIndex,
  formatAmount,
  formatShortDateTime,
  isPast,
} from '../components/jobs/jobPresentation';
import useJobActions from '../hooks/useJobActions';
import {
  BODY_LABELS,
  CARGO_TYPE_LABELS,
  LOADING_LABELS,
  PACKAGE_UNIT_LABELS,
  VEHICLE_LABELS,
} from '../utils/driverOrder';

const CARD = 'rounded-lg border border-line bg-card p-4 sm:p-5';
const REQUEST_NOTICE = 'rounded-lg border border-orange-300 bg-signal-soft px-4 py-3.5';

// 운송 상세를 불러온다. 다시 불러오는 동안에는 이전 내용을 그대로 보여 준다.
function useDriverJob(orderId) {
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState(null);
  const requestKey = `${orderId}:${reloadCount}`;

  useEffect(() => {
    let isActive = true;
    fetchMyJob(orderId)
      .then((job) => {
        // 배차 취소 마감을 지났는지 판단할 기준 시각을 불러온 때로 고정한다.
        if (isActive) setResult({ key: requestKey, job, loadedAt: Date.now() });
      })
      .catch((error) => {
        if (isActive) setResult({ key: requestKey, error });
      });
    return () => {
      isActive = false;
    };
  }, [orderId, requestKey]);

  return { result, reload: () => setReloadCount((count) => count + 1) };
}

// 차주 운송 상세 화면(배차 후). 상세주소·연락처, 화물 정보, 진행 버튼, 상태 이력을 보여 준다.
export default function DriverJobDetailPage() {
  const { id } = useParams();
  const { result, reload } = useDriverJob(id);
  const { banner, submittingId, requestAction, requestCancel, dialogs } = useJobActions(reload);

  return (
    <section className="flex flex-col gap-5 break-keep">
      <Link to="/driver/jobs" className="text-ink self-start font-semibold underline">
        내 운송으로 돌아가기
      </Link>
      <JobBanner banner={banner} />
      {!result && (
        <p className="text-muted py-8 text-center text-sm">운송 정보를 불러오는 중입니다…</p>
      )}
      {result?.error && (
        <p
          role="alert"
          className="bg-danger-soft rounded-lg border border-red-200 px-4 py-3.5 text-sm text-red-800"
        >
          {result.error.message}
        </p>
      )}
      {result?.job && (
        <JobDetail
          job={result.job}
          now={result.loadedAt}
          isBusy={submittingId === result.job.orderId}
          onAction={requestAction}
          onCancelAssignment={requestCancel}
        />
      )}
      <JobActionDialogs {...dialogs} />
    </section>
  );
}

// 불러온 운송 상세 전체. 왼쪽에 운송·화물·연락처, 오른쪽에 운임과 상태 이력을 둔다.
function JobDetail({ job, now, isBusy, onAction, onCancelAssignment }) {
  return (
    <>
      <JobHeader job={job} />
      {findCurrentStepIndex(job.status) !== null && (
        <div className={CARD}>
          <JobProgress status={job.status} />
        </div>
      )}
      <JobNextStep
        job={job}
        now={now}
        isBusy={isBusy}
        onAction={onAction}
        onCancelAssignment={onCancelAssignment}
      />
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-5">
          <TransportInfo job={job} />
          <CargoInfo job={job} />
          <ContactInfo job={job} />
        </div>
        <div className="flex flex-col gap-5">
          <FareCard job={job} />
          <StatusHistory history={job.history ?? []} />
        </div>
      </div>
    </>
  );
}

// 오더 번호, 상태, 요구 차종, 구간, 운임.
function JobHeader({ job }) {
  const vehicle = [VEHICLE_LABELS[job.requiredVehicleType], BODY_LABELS[job.bodyType]]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption text-muted font-mono">#{job.orderId}</span>
          <JobStatusBadge status={job.status} />
          {vehicle && (
            <span className="text-caption inline-flex min-h-6 items-center rounded-sm bg-slate-200 px-2 font-medium text-slate-700">
              {vehicle}
            </span>
          )}
        </div>
        <RouteLine pickup={job.pickup} dropoff={job.dropoff} size="text-h1-sm sm:text-h1" />
      </div>
      <p className="text-fare-lg text-ink font-bold tabular-nums">{formatAmount(job.fare)}원</p>
    </div>
  );
}

// 지금 차주가 할 일. 배차완료·운송중이면 진행 버튼, 그 밖의 상태는 안내 문구를 보여 준다.
function JobNextStep({ job, now, isBusy, onAction, onCancelAssignment }) {
  const action = JOB_ACTIONS[job.status];
  if (job.status === 'AWAITING_CONFIRM' && job.autoConfirmAt) {
    return (
      <p className="bg-primary-soft rounded-lg border border-blue-200 px-4 py-3.5 text-sm text-blue-900">
        화주의 수령 확인을 기다리고 있습니다. {formatShortDateTime(job.autoConfirmAt)}까지 확인이
        없으면 자동으로 확인되고 운임이 지급됩니다.
      </p>
    );
  }
  if (!action) return <JobStatusNotice status={job.status} />;

  const isAssigned = job.status === 'ASSIGNED';
  // 설계 문서 3장: 상차 희망 시각 2시간 전부터는 차주가 직접 배차를 취소할 수 없다.
  const isCancelClosed = isPast(job.driverCancelableUntil, now);
  return (
    <div className={`${REQUEST_NOTICE} flex flex-col gap-3`}>
      <div>
        <p className="text-signal-ink font-bold">
          {isAssigned ? '상차를 마치면' : '하차를 마치면'} {action.label}를 눌러 주세요
        </p>
        <p className="text-signal-ink mt-1 text-sm">
          {isAssigned
            ? `상차 희망 시각은 ${formatShortDateTime(job.pickupAt)}입니다. ${
                isCancelClosed
                  ? '직접 취소할 수 있는 시각이 지났습니다. 취소가 필요하면 관리자에게 요청하세요.'
                  : `직접 취소는 ${formatShortDateTime(job.driverCancelableUntil)}까지 할 수 있습니다.`
              }`
            : `도착 희망 시각은 ${formatShortDateTime(job.arriveBy)}입니다.`}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onAction(job, action)}
          className={PRIMARY_BUTTON}
        >
          {isBusy ? '처리 중…' : action.label}
        </button>
        {isAssigned && (
          <button
            type="button"
            disabled={isBusy || isCancelClosed}
            onClick={() => onCancelAssignment(job)}
            className={SECONDARY_BUTTON}
          >
            배차 취소
          </button>
        )}
      </div>
    </div>
  );
}

// 상차지·하차지 한 곳. 배정된 차주라 상세주소까지 보인다.
function LocationBlock({ label, marker, location, timeLabel, time }) {
  return (
    <div className="flex gap-3">
      <span aria-hidden="true" className={`mt-1.5 size-2.5 shrink-0 ${marker}`} />
      <div className="min-w-0">
        <p className="text-caption text-subtle">{label}</p>
        <p className="text-copy mt-1 break-words">
          {[location?.address, location?.detailAddress].filter(Boolean).join(', ') || '-'}
        </p>
        <p className="text-caption text-muted mt-1 tabular-nums">
          {timeLabel} {formatShortDateTime(time)}
        </p>
      </div>
    </div>
  );
}

// 카카오맵 길찾기 링크(상차지 → 하차지). 좌표를 그대로 넘긴다.
function buildKakaoRouteUrl(pickup, dropoff) {
  const point = (name, location) => `${name},${location.latitude},${location.longitude}`;
  return `https://map.kakao.com/link/from/${encodeURIComponent(point('상차지', pickup))}/to/${encodeURIComponent(point('하차지', dropoff))}`;
}

// 운송 정보: 상차지·하차지, 거리, 요구 차종, 적재함, 상하차 방법, 요청 사항, 길찾기.
function TransportInfo({ job }) {
  return (
    <section className={`${CARD} flex flex-col gap-5`}>
      <h2 className="text-h2 text-ink font-bold">운송 정보</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <LocationBlock
          label="상차지"
          marker="rounded-full bg-primary"
          location={job.pickup}
          timeLabel="상차 희망"
          time={job.pickupAt}
        />
        <LocationBlock
          label="하차지"
          marker="bg-ink"
          location={job.dropoff}
          timeLabel="도착 희망"
          time={job.arriveBy}
        />
      </div>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <JobField label="거리">{`${formatAmount(Math.round(job.distanceKm ?? 0))}km`}</JobField>
        <JobField label="요구 차종">{VEHICLE_LABELS[job.requiredVehicleType]}</JobField>
        <JobField label="적재함">{BODY_LABELS[job.bodyType]}</JobField>
        <JobField label="상하차">{LOADING_LABELS[job.loadingMethod]}</JobField>
      </dl>
      {job.memo && (
        <dl>
          <JobField label="요청 사항">{job.memo}</JobField>
        </dl>
      )}
      {/* TODO(E): B의 공통 지도 컴포넌트 OrderMap이 나오면 두 지점 지도를 이 자리에 넣는다. */}
      <a
        href={buildKakaoRouteUrl(job.pickup, job.dropoff)}
        target="_blank"
        rel="noreferrer"
        className={`${SECONDARY_BUTTON} self-end`}
      >
        카카오맵에서 길찾기
      </a>
    </section>
  );
}

// 화물 정보: 품목, 종류, 중량, 수량, 크기, 취급 주의.
function CargoInfo({ job }) {
  const size = [job.widthCm, job.depthCm, job.heightCm].every(Boolean)
    ? `${job.widthCm}×${job.depthCm}×${job.heightCm}cm`
    : null;
  const handling = [job.fragile && '파손 주의', job.noStack && '적재 금지']
    .filter(Boolean)
    .join(', ');
  return (
    <section className={`${CARD} flex flex-col gap-4`}>
      <h2 className="text-h2 text-ink font-bold">화물 정보</h2>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <JobField label="품목명">{job.itemName}</JobField>
        <JobField label="화물 종류">{CARGO_TYPE_LABELS[job.cargoType]}</JobField>
        <JobField label="중량">{`${formatAmount(job.weightKg)}kg`}</JobField>
        <JobField label="수량">{`${job.quantity} ${PACKAGE_UNIT_LABELS[job.packageUnit] ?? ''}`}</JobField>
        {size && <JobField label="크기">{size}</JobField>}
        {handling && <JobField label="취급 주의">{handling}</JobField>}
      </dl>
    </section>
  );
}

// 이름과 전화 걸기 링크.
function ContactValue({ location }) {
  if (!location?.contactName && !location?.contactPhone) return null;
  return (
    <>
      {location.contactName}{' '}
      {location.contactPhone && (
        <a href={`tel:${location.contactPhone}`} className="text-primary-dark underline">
          {location.contactPhone}
        </a>
      )}
    </>
  );
}

// 연락처: 상차지 현장 담당자, 하차지 수령인, 화주.
function ContactInfo({ job }) {
  return (
    <section className={`${CARD} flex flex-col gap-4`}>
      <h2 className="text-h2 text-ink font-bold">연락처</h2>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <JobField label="현장 담당자">
          <ContactValue location={job.pickup} />
        </JobField>
        <JobField label="수령인">
          <ContactValue location={job.dropoff} />
        </JobField>
        <JobField label="화주">{job.shipperName}</JobField>
      </dl>
    </section>
  );
}

// 운임과 결제(에스크로) 상태.
function FareCard({ job }) {
  return (
    <section className={CARD}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-h2 text-ink font-bold">운임</h2>
        {job.paymentStatus && (
          <span className="text-caption bg-primary-soft inline-flex min-h-6 items-center rounded-sm px-2 font-medium text-blue-900">
            {PAYMENT_STATUS_LABELS[job.paymentStatus] ?? job.paymentStatus}
          </span>
        )}
      </div>
      <p className="text-fare text-ink mt-3 font-bold tabular-nums">{formatAmount(job.fare)}원</p>
      <p className="text-muted mt-3 text-sm">
        화주가 수령을 확인하면 지급합니다. 하차 후 정해진 시간 동안 확인이 없으면 자동으로
        지급합니다.
      </p>
    </section>
  );
}

// 상태 이력을 최신순으로 보여 준다. 메모(운임 수정 금액, 취소 사유 등)가 있으면 상태 이름 대신 메모를 쓴다.
function StatusHistory({ history }) {
  const newestFirst = [...history].reverse();
  return (
    <section className={CARD}>
      <h2 className="text-h2 text-ink font-bold">상태 이력</h2>
      {newestFirst.length === 0 ? (
        <p className="text-muted mt-3 text-sm">기록된 이력이 없습니다.</p>
      ) : (
        <ol className="border-line mt-4 flex flex-col gap-4 border-l pl-4">
          {newestFirst.map((entry, index) => (
            <li key={`${entry.createdAt}-${index}`}>
              <p className="text-caption text-subtle tabular-nums">
                {formatShortDateTime(entry.createdAt)}
              </p>
              <p className="text-copy mt-1 text-sm">
                {entry.memo || JOB_STATUS[entry.toStatus]?.label || entry.toStatus}
                {entry.actorName && ` · ${entry.actorName}`}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

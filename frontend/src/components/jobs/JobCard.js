import {
  JOB_ACTIONS,
  JOB_STATUS,
  JOB_STEPS,
  findCurrentStepIndex,
  formatAmount,
  formatShortDateTime,
  isPast,
} from './jobPresentation';

const BUTTON_BASE =
  'inline-flex min-h-11 items-center justify-center rounded-md border px-4.5 font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-muted';
const PRIMARY_BUTTON = `${BUTTON_BASE} border-transparent bg-primary text-white hover:bg-primary-dark`;
const SECONDARY_BUTTON = `${BUTTON_BASE} border-line-strong bg-white text-copy hover:bg-slate-50`;

// 오더 상태를 글자와 색으로 함께 보여 주는 뱃지.
export function JobStatusBadge({ status }) {
  const style = JOB_STATUS[status];
  return (
    <span
      className={`text-caption inline-flex min-h-6 items-center rounded-sm px-2.5 font-semibold whitespace-nowrap ${style?.className ?? 'bg-slate-200 text-slate-700'}`}
    >
      {style?.label ?? status}
    </span>
  );
}

// 출발지(파란 원)와 도착지(ink 사각형)를 선으로 잇는 구간 표시.
function RouteLine({ pickup, dropoff }) {
  return (
    <p className="text-h2 text-ink flex flex-wrap items-center gap-x-2 font-bold">
      <span>{pickup?.region ?? '-'}</span>
      <span aria-hidden="true" className="flex items-center">
        <span className="bg-primary size-2 rounded-full" />
        <span className="bg-line-strong h-px w-6" />
        <span className="bg-ink size-2" />
      </span>
      <span className="sr-only">에서</span>
      <span>{dropoff?.region ?? '-'}</span>
    </p>
  );
}

// 배차 → 상차 → 운송 → 하차 → 지급 다섯 단계 중 어디까지 왔는지 보여 준다.
function JobProgress({ status }) {
  const currentIndex = findCurrentStepIndex(status);
  if (currentIndex === null) return null;
  return (
    <ol className="grid grid-cols-5" aria-label="운송 진행 단계">
      {JOB_STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        const dotColor = isCurrent
          ? 'border-ink bg-signal'
          : isDone
            ? 'border-primary bg-primary'
            : 'border-line-strong bg-white';
        return (
          <li key={step} className="flex flex-col items-center gap-1.5">
            <span className="flex w-full items-center">
              <span
                className={`h-0.5 flex-1 ${index === 0 ? '' : isDone || isCurrent ? 'bg-primary' : 'bg-line-strong'}`}
              />
              <span className={`size-4 shrink-0 rounded-full border-2 ${dotColor}`} />
              <span
                className={`h-0.5 flex-1 ${index === JOB_STEPS.length - 1 ? '' : isDone ? 'bg-primary' : 'bg-line-strong'}`}
              />
            </span>
            <span
              className={`text-caption ${isCurrent ? 'text-ink font-semibold' : 'text-subtle'}`}
            >
              {step}
              {isCurrent && <span className="sr-only"> (지금 단계)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// 항목 이름과 값을 한 칸으로 보여 준다.
function JobField({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-subtle">{label}</dt>
      <dd className="text-copy mt-1 break-words tabular-nums">{children || '-'}</dd>
    </div>
  );
}

// 배차완료면 상차지, 그 뒤에는 하차지 정보를 보여 준다. 배정된 차주라 상세주소와 연락처가 보인다.
function JobLocationFields({ job }) {
  const isBeforePickup = job.status === 'ASSIGNED';
  const location = isBeforePickup ? job.pickup : job.dropoff;
  const address = [location?.address, location?.detailAddress].filter(Boolean).join(', ');
  const contact = [location?.contactName, location?.contactPhone].filter(Boolean).join(' ');
  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <JobField label={isBeforePickup ? '상차지' : '하차지'}>{address}</JobField>
      <JobField label={isBeforePickup ? '현장 담당자' : '수령인'}>{contact}</JobField>
      <JobField label={isBeforePickup ? '상차 희망' : '도착 희망'}>
        {formatShortDateTime(isBeforePickup ? job.pickupAt : job.arriveBy)}
      </JobField>
    </dl>
  );
}

// 지금 차주가 버튼으로 할 일이 없는 상태의 안내 문구.
function JobStatusNotice({ status }) {
  if (status === 'AWAITING_CONFIRM') {
    return (
      <p className="bg-primary-soft rounded-lg border border-blue-200 px-4 py-3.5 text-sm text-blue-900">
        화주의 수령 확인을 기다리고 있습니다. 확인이 없어도 정해진 시간이 지나면 자동으로 확인되고
        운임이 지급됩니다.
      </p>
    );
  }
  if (status === 'DISPUTED') {
    return (
      <p className="bg-signal-soft text-signal-ink rounded-lg border border-orange-300 px-4 py-3.5 text-sm">
        화주가 문제를 신고해 관리자가 확인하고 있습니다. 처리 결과에 따라 운임이 지급되거나
        환불됩니다.
      </p>
    );
  }
  return null;
}

// 끝난 운송의 결과. 운송완료면 지급 내역에서 찾은 지급 금액과 시각을 보여 준다.
function FinishedJobResult({ job, payout }) {
  if (job.status === 'CANCELLED') {
    return <p className="text-muted text-sm">취소된 운송입니다.</p>;
  }
  if (!payout) {
    return <p className="text-muted text-sm">운송이 완료되었습니다.</p>;
  }
  return (
    <dl className="grid grid-cols-2 gap-4">
      <JobField label="지급 금액">{`${formatAmount(payout.amount)}원`}</JobField>
      <JobField label="지급 시각">{formatShortDateTime(payout.paidAt)}</JobField>
    </dl>
  );
}

// 내 운송 카드 한 장. 상태에 맞는 진행 버튼 하나와, 배차완료면 배차 취소 버튼을 둔다.
export default function JobCard({ job, payout, now, isBusy, onAction, onCancelAssignment }) {
  const action = JOB_ACTIONS[job.status];
  const isAssigned = job.status === 'ASSIGNED';
  // 설계 문서 3장: 상차 희망 시각 2시간 전부터는 차주가 직접 배차를 취소할 수 없다.
  const isCancelClosed = isPast(job.driverCancelableUntil, now);
  const isFinished = job.status === 'COMPLETED' || job.status === 'CANCELLED';

  return (
    <li className="border-line bg-card flex flex-col gap-4 rounded-lg border p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-caption text-muted font-mono">#{job.orderId}</span>
          <JobStatusBadge status={job.status} />
        </div>
        <p className="text-fare text-ink font-bold tabular-nums">{formatAmount(job.fare)}원</p>
      </div>

      <RouteLine pickup={job.pickup} dropoff={job.dropoff} />
      {!isFinished && <JobProgress status={job.status} />}
      {isFinished ? (
        <FinishedJobResult job={job} payout={payout} />
      ) : (
        <JobLocationFields job={job} />
      )}
      <JobStatusNotice status={job.status} />

      {(action || isAssigned) && (
        <div className="flex flex-wrap gap-2">
          {/* TODO(E): 운송 상세(/driver/jobs/:id) 화면을 만들면 '상세' 버튼을 여기에 둔다. */}
          {action && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onAction(job, action)}
              className={`${PRIMARY_BUTTON} min-w-40 flex-1`}
            >
              {isBusy ? '처리 중…' : action.label}
            </button>
          )}
          {isAssigned && (
            <button
              type="button"
              disabled={isBusy || isCancelClosed}
              onClick={() => onCancelAssignment(job)}
              className={`${SECONDARY_BUTTON} w-full sm:w-auto`}
            >
              배차 취소
            </button>
          )}
        </div>
      )}
      {isAssigned && job.driverCancelableUntil && (
        <p className="text-caption text-muted">
          {isCancelClosed
            ? '상차 2시간 전이 지나 직접 취소할 수 없습니다. 취소가 필요하면 관리자에게 요청하세요.'
            : `상차 희망 시각 2시간 전(${formatShortDateTime(job.driverCancelableUntil)})부터는 직접 취소할 수 없습니다.`}
        </p>
      )}
    </li>
  );
}

// 차주 내 운송 화면이 함께 쓰는 상태 이름, 진행 단계, 날짜 표기 모음.

// 상태 뱃지의 글자와 색. 색 이름은 docs/design/ui-guide.md '오더 상태 뱃지'를 따른다.
export const JOB_STATUS = Object.freeze({
  REGISTERED: { label: '등록됨', className: 'bg-status-registered text-status-registered-ink' },
  ASSIGNED: { label: '배차완료', className: 'bg-status-assigned text-status-assigned-ink' },
  IN_TRANSIT: { label: '운송중', className: 'bg-status-transit text-status-transit-ink' },
  AWAITING_CONFIRM: {
    label: '수령확인대기',
    className: 'bg-status-awaiting text-status-awaiting-ink',
  },
  COMPLETED: { label: '운송완료', className: 'bg-status-completed text-status-completed-ink' },
  DISPUTED: { label: '분쟁', className: 'bg-status-disputed text-status-disputed-ink' },
  CANCELLED: { label: '취소됨', className: 'bg-status-cancelled text-status-cancelled-ink' },
});

// 진행 단계 다섯 칸(ui-guide '진행 단계'). 끝난 단계는 primary, 지금 단계는 signal로 칠한다.
export const JOB_STEPS = Object.freeze(['배차', '상차', '운송', '하차', '지급']);

// 상태별 '지금 단계'의 위치. 모든 칸이 끝났으면 JOB_STEPS.length다.
// 배차완료면 다음 할 일이 상차이고, 수령확인대기면 하차까지 끝나고 지급을 기다린다.
const CURRENT_STEP_INDEX = Object.freeze({
  ASSIGNED: 1,
  IN_TRANSIT: 2,
  AWAITING_CONFIRM: 4,
  COMPLETED: JOB_STEPS.length,
});

// 진행 단계를 그리지 않는 상태(분쟁·취소)는 null을 돌려준다.
export function findCurrentStepIndex(status) {
  return CURRENT_STEP_INDEX[status] ?? null;
}

// 상태마다 차주가 누를 수 있는 진행 버튼은 하나뿐이다(설계 문서 3장 상태 전이).
export const JOB_ACTIONS = Object.freeze({
  ASSIGNED: {
    type: 'pickup',
    label: '상차 완료',
    confirmText: '상차 완료로 바꾸면 운송중 상태가 되고 되돌릴 수 없습니다.',
  },
  IN_TRANSIT: {
    type: 'dropoff',
    label: '하차 완료',
    confirmText: '하차 완료로 바꾸면 화주에게 수령 확인을 요청하고 되돌릴 수 없습니다.',
  },
});

const SEOUL_TIME_ZONE = 'Asia/Seoul';

// 서버는 시간대 없이 한국 시각을 보낸다. 시간대가 없으면 +09:00으로 읽는다.
function toDate(value) {
  if (!value) return null;
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const date = new Date(hasZone ? value : `${value}+09:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// '11.04 18:00'처럼 월.일 시:분으로 짧게 보여 준다.
export function formatShortDateTime(value) {
  const date = toDate(value);
  if (!date) return '-';
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: SEOUL_TIME_ZONE,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('month')}.${part('day')} ${part('hour')}:${part('minute')}`;
}

// '11.02'처럼 월.일만 보여 준다.
export function formatShortDate(value) {
  return formatShortDateTime(value).split(' ')[0];
}

// now(밀리초)가 기준 시각을 지났는지 확인한다. 기준 시각이 없으면 지나지 않은 것으로 본다.
export function isPast(value, now) {
  const date = toDate(value);
  return date ? date.getTime() <= now : false;
}

// 금액과 수량을 천 단위 쉼표로 보여 준다.
export function formatAmount(value) {
  return new Intl.NumberFormat('ko-KR').format(value ?? 0);
}

export const ORDER_STATUS = {
  REGISTERED: { label: '배차 대기', color: 'bg-blue-50 text-blue-700' },
  ASSIGNED: { label: '배차 완료', color: 'bg-indigo-50 text-indigo-700' },
  IN_TRANSIT: { label: '운송 중', color: 'bg-violet-50 text-violet-700' },
  AWAITING_CONFIRM: { label: '수령 확인 대기', color: 'bg-amber-50 text-amber-800' },
  COMPLETED: { label: '운송 완료', color: 'bg-emerald-50 text-emerald-700' },
  DISPUTED: { label: '분쟁 처리 중', color: 'bg-orange-50 text-orange-800' },
  CANCELLED: { label: '취소', color: 'bg-gray-100 text-gray-600' },
};
export const VEHICLE_LABELS = {
  TON_1: '1톤',
  TON_2_5: '2.5톤',
  TON_5: '5톤',
  TON_11: '11톤',
  TON_25: '25톤',
};
export const BODY_LABELS = {
  CARGO: '카고',
  WING: '윙바디',
  BOX: '탑차',
  REFRIGERATED: '냉장·냉동',
};
export const LOADING_LABELS = { FORKLIFT: '지게차', MANUAL: '수작업' };
export const CARGO_LABELS = {
  GENERAL: '일반 화물',
  PALLET: '팔레트',
  MACHINERY: '기계',
  CONSTRUCTION: '건설 자재',
  FURNITURE_APPLIANCE: '가구·가전',
  OTHER: '기타',
};
export const PACKAGE_LABELS = { BOX: '박스', PALLET: '팔레트', PIECE: '개' };

// 서버의 한국 현지 시각을 사용자에게 날짜와 시간으로 보여 준다.
export function formatDateTime(value) {
  if (!value) return '미지정';
  const zonedValue = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}+09:00`;
  const date = new Date(zonedValue);
  if (Number.isNaN(date.getTime())) return '날짜 확인 필요';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

// 단위가 없는 숫자와 원화 금액의 표기를 통일한다.
export function formatNumber(value) {
  return value == null ? '—' : new Intl.NumberFormat('ko-KR').format(value);
}

// 알려지지 않은 상태도 원래 값을 남겨 새 상태 추가 시 화면이 깨지지 않게 한다.
export function statusLabel(status) {
  return ORDER_STATUS[status]?.label ?? status ?? '등록';
}

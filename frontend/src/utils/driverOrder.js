'use strict';

// 차주 화면(의뢰 목록·의뢰 상세)이 함께 쓰는 라벨과 계산 함수 모음.

export const VEHICLE_LABELS = Object.freeze({
  TON_1: '1톤',
  TON_2_5: '2.5톤',
  TON_5: '5톤',
  TON_11: '11톤',
  TON_25: '25톤',
});

// 서버가 응답에 최대 적재량을 주지 않을 때를 위한 값. 서버의 VehicleType과 같아야 한다.
export const VEHICLE_MAX_LOAD = Object.freeze({
  TON_1: 1000,
  TON_2_5: 2500,
  TON_5: 5000,
  TON_11: 11000,
  TON_25: 25000,
});

export const BODY_LABELS = Object.freeze({
  CARGO: '카고',
  WING: '윙바디',
  BOX: '탑차',
  REFRIGERATED: '냉장·냉동',
});

export const LOADING_LABELS = Object.freeze({
  FORKLIFT: '지게차',
  MANUAL: '수작업',
});

export const CARGO_TYPE_LABELS = Object.freeze({
  GENERAL: '일반',
  PALLET: '파렛트',
  MACHINERY: '기계·설비',
  CONSTRUCTION: '건자재',
  FURNITURE_APPLIANCE: '가구·가전',
  OTHER: '기타',
});

export const PACKAGE_UNIT_LABELS = Object.freeze({
  BOX: '박스',
  PALLET: '파렛트',
  PIECE: '개',
});

const SEOUL_TIME_ZONE = 'Asia/Seoul';
const DRIVER_CANCEL_CUTOFF_HOURS = 2;

// 서버가 시간대 없이 보낸 문자열을 한국 시각(+09:00) Date 객체로 바꾼다.
function parseSeoulDate(value) {
  if (!value) return null;
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(String(value));
  const date = new Date(hasZone ? value : `${value}+09:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Date 객체를 '11.06 13:00' 모양의 문자열로 바꾼다.
function formatParts(date) {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: SEOUL_TIME_ZONE,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const pick = (type) => parts.find((item) => item.type === type)?.value ?? '';
  return `${pick('month')}.${pick('day')} ${pick('hour')}:${pick('minute')}`;
}

// 날짜·시각 문자열을 시안 규격('11.06 13:00')으로 보여 준다.
export function formatDateTime(value) {
  const date = parseSeoulDate(value);
  return date ? formatParts(date) : '-';
}

// 상차 희망 시각에서 2시간 전(차주 직접 취소 마감 시각)을 계산해 '11.06 11:00' 모양으로 돌려준다.
export function formatCancelCutoffTime(pickupAt) {
  const date = parseSeoulDate(pickupAt);
  if (!date) return '-';
  const cutoffDate = new Date(date.getTime() - DRIVER_CANCEL_CUTOFF_HOURS * 60 * 60 * 1000);
  return formatParts(cutoffDate);
}

// 숫자를 천 단위 쉼표 문자열로 바꾼다.
export function formatAmount(value) {
  return new Intl.NumberFormat('ko-KR').format(Number(value ?? 0));
}

// 차종과 적재함 형태를 '5톤 · 카고'처럼 한 줄 태그 문자열로 합친다.
export function formatVehicleTag(vehicleType, bodyType) {
  return [
    VEHICLE_LABELS[vehicleType] ?? vehicleType,
    bodyType ? (BODY_LABELS[bodyType] ?? bodyType) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

// 내 차량과 의뢰 조건이 어긋나는 점을 사람이 읽을 문장으로 만든다. 어긋남이 없으면 빈 배열이다.
export function buildMismatchMessages({
  driverVehicleType,
  requiredVehicleType,
  weightKg,
  maxLoadKg,
}) {
  const messages = [];
  if (driverVehicleType && requiredVehicleType && driverVehicleType !== requiredVehicleType) {
    const myLabel = VEHICLE_LABELS[driverVehicleType] ?? driverVehicleType;
    const reqLabel = VEHICLE_LABELS[requiredVehicleType] ?? requiredVehicleType;
    messages.push(`보유 차량(${myLabel})과 요구 차종(${reqLabel})이 다릅니다.`);
  }
  const numWeight = Number(weightKg);
  const numMax = Number(maxLoadKg);
  if (Number.isFinite(numWeight) && Number.isFinite(numMax) && numWeight > numMax) {
    messages.push(
      `화물 중량(${numWeight.toLocaleString()}kg)이 차량 최대 적재량(${numMax.toLocaleString()}kg)을 넘습니다.`,
    );
  }
  return messages;
}

// 내 차량 기준으로 이 의뢰를 수락할 때 경고할 문장들을 돌려준다. 차량이 없으면 서버가 막으므로 빈 배열이다.
export function checkMyVehicleMismatch(myVehicle, order) {
  if (!myVehicle?.vehicleType) return [];
  const maxLoadKg = myVehicle.maxLoadKg ?? VEHICLE_MAX_LOAD[myVehicle.vehicleType];
  return buildMismatchMessages({
    driverVehicleType: myVehicle.vehicleType,
    requiredVehicleType: order.requiredVehicleType,
    weightKg: order.weightKg,
    maxLoadKg,
  });
}

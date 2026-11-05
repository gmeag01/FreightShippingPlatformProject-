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

export function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
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

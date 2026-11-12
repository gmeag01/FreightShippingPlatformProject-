// 기본값은 실제 장소나 추천 운임으로 오인할 값 없이 시작한다.
export function emptyOrder() {
  const location = () => ({
    address: '',
    detailAddress: '',
    region: '',
    latitude: '',
    longitude: '',
    contactName: '',
    contactPhone: '',
  });
  return {
    pickup: location(),
    dropoff: location(),
    cargo: { cargoType: 'GENERAL', packageUnit: 'BOX', quantity: 1 },
    requiredVehicleType: 'TON_1',
    loadingMethod: 'FORKLIFT',
  };
}

// 화면의 문자열 입력을 서버 DTO로 바꾸고 빈 선택 숫자는 null로 보낸다.
export function readOrderForm(form, initial) {
  const fields = new FormData(form);
  const text = (key) => String(fields.get(key) ?? '').trim();
  const number = (key) => Number(text(key));
  const optionalNumber = (key) => (text(key) === '' ? null : number(key));
  const location = (name) =>
    Object.fromEntries(
      [
        'address',
        'detailAddress',
        'region',
        'latitude',
        'longitude',
        'contactName',
        'contactPhone',
      ].map((field) => [
        field,
        ['latitude', 'longitude'].includes(field)
          ? optionalNumber(`${name}.${field}`)
          : text(`${name}.${field}`),
      ]),
    );
  return {
    pickup: location('pickup'),
    dropoff: location('dropoff'),
    pickupAt: text('pickupAt'),
    arriveBy: text('arriveBy'),
    cargo: {
      itemName: text('cargo.itemName'),
      cargoType: text('cargo.cargoType'),
      weightKg: number('cargo.weightKg'),
      quantity: number('cargo.quantity'),
      packageUnit: text('cargo.packageUnit'),
      widthCm: optionalNumber('cargo.widthCm'),
      depthCm: optionalNumber('cargo.depthCm'),
      heightCm: optionalNumber('cargo.heightCm'),
      fragile: fields.has('cargo.fragile'),
      noStack: fields.has('cargo.noStack'),
    },
    requiredVehicleType: text('requiredVehicleType'),
    bodyType: text('bodyType') || null,
    loadingMethod: text('loadingMethod'),
    memo: text('memo'),
    fare: number('fare'),
    // 견적 재계산 결과는 OrderForm에서 반영한다. 조건을 바꾸지 않은 수정은 기존 참고값을 보존한다.
    recommendedFare: initial.recommendedFare ?? 0,
    distanceKm: initial.distanceKm ?? 0,
  };
}

const MINUTE_MS = 60_000;
const KOREA_OFFSET_MS = 9 * 60 * MINUTE_MS;

// 한국 시각 기준으로 주어진 시각보다 늦은 첫 번째 입력 가능 분을 반환한다.
export function nextKoreanMinute(timestamp) {
  if (!Number.isFinite(timestamp)) return undefined;
  const nextMinute = (Math.floor(timestamp / MINUTE_MS) + 1) * MINUTE_MS;
  return new Date(nextMinute + KOREA_OFFSET_MS).toISOString().slice(0, 16);
}

// datetime-local 입력값을 한국 시각으로 해석한다.
export function parseKoreanTime(value) {
  return new Date(`${value}+09:00`).getTime();
}

// 등록 확인과 추천 운임 계산에서 같은 시각 규칙을 적용한다.
export function validateOrderSchedule(details, isEditing, now = Date.now()) {
  const errors = {};
  const pickup = parseKoreanTime(details.pickupAt);
  const dropoff = parseKoreanTime(details.arriveBy);
  if (!Number.isFinite(pickup)) errors.pickupAt = '상차 희망 시각을 입력해 주세요.';
  else if (!isEditing && pickup <= now) errors.pickupAt = '상차 희망 시각은 현재 이후여야 합니다.';
  if (!Number.isFinite(dropoff) || dropoff <= pickup)
    errors.arriveBy = '도착 희망 시각은 상차 이후로 선택해 주세요.';
  return errors;
}

// 브라우저 기본 검증에 업무상 일정·정수 범위·공백 입력 검증을 더한다.
export function validateOrderForm(details, isEditing, now = Date.now()) {
  const errors = {};
  for (const name of ['pickup', 'dropoff']) {
    for (const field of ['address', 'detailAddress', 'region', 'contactName', 'contactPhone']) {
      if (!details[name][field]) errors[`${name}.${field}`] = '공백 없이 내용을 입력해 주세요.';
    }
    const { latitude, longitude } = details[name];
    if (
      !errors[`${name}.address`] &&
      (!Number.isFinite(latitude) ||
        Math.abs(latitude) > 90 ||
        !Number.isFinite(longitude) ||
        Math.abs(longitude) > 180)
    ) {
      errors[`${name}.address`] =
        '주소는 입력됐지만 위치 확인이 필요합니다. 주소 칸 아래의 안내를 확인해 주세요.';
    }
  }
  if (!details.cargo.itemName) errors['cargo.itemName'] = '품명을 입력해 주세요.';
  Object.assign(errors, validateOrderSchedule(details, isEditing, now));
  for (const field of ['weightKg', 'quantity', 'widthCm', 'depthCm', 'heightCm']) {
    const value = details.cargo[field];
    if (value != null && (!Number.isInteger(value) || value <= 0 || value > 2147483647))
      errors[`cargo.${field}`] = '1~2,147,483,647 사이의 정수를 입력해 주세요.';
  }
  if (!Number.isSafeInteger(details.fare) || details.fare <= 0)
    errors.fare = '운임은 1원 이상의 정수로 입력해 주세요.';
  return errors;
}

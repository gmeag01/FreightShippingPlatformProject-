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
          ? number(`${name}.${field}`)
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
    // TODO(B): 주소·운임 서비스 연결 시 서버가 확정한 견적을 사용한다. 수정 시 기존 참고값은 보존한다.
    recommendedFare: initial.recommendedFare ?? 0,
    distanceKm: initial.distanceKm ?? 0,
  };
}

// 브라우저 기본 검증에 업무상 일정·정수 범위·공백 입력 검증을 더한다.
export function validateOrderForm(details, isEditing, now = Date.now()) {
  const errors = {};
  for (const name of ['pickup', 'dropoff']) {
    for (const field of ['address', 'detailAddress', 'region', 'contactName', 'contactPhone']) {
      if (!details[name][field]) errors[`${name}.${field}`] = '공백 없이 내용을 입력해 주세요.';
    }
  }
  if (!details.cargo.itemName) errors['cargo.itemName'] = '품명을 입력해 주세요.';
  const pickup = new Date(`${details.pickupAt}+09:00`).getTime();
  const dropoff = new Date(`${details.arriveBy}+09:00`).getTime();
  if (!Number.isFinite(pickup)) errors.pickupAt = '상차 희망 시각을 입력해 주세요.';
  else if (!isEditing && pickup <= now) errors.pickupAt = '상차 희망 시각은 현재 이후여야 합니다.';
  if (!Number.isFinite(dropoff) || dropoff <= pickup)
    errors.arriveBy = '도착 희망 시각은 상차 이후로 선택해 주세요.';
  for (const field of ['weightKg', 'quantity', 'widthCm', 'depthCm', 'heightCm']) {
    const value = details.cargo[field];
    if (value != null && (!Number.isInteger(value) || value <= 0 || value > 2147483647))
      errors[`cargo.${field}`] = '1~2,147,483,647 사이의 정수를 입력해 주세요.';
  }
  if (!Number.isSafeInteger(details.fare) || details.fare <= 0)
    errors.fare = '운임은 1원 이상의 정수로 입력해 주세요.';
  return errors;
}

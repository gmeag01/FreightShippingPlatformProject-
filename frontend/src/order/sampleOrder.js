// 개발용 예시 입력값. 시간은 버튼을 누른 시점에서 하루 뒤의 한국 시간으로 만든다.
export function createSampleOrderFields(now = Date.now()) {
  const hour = 60 * 60 * 1000;
  const koreanDateTime = (afterHours) =>
    new Date(now + (afterHours + 9) * hour).toISOString().slice(0, 16);
  return {
    'pickup.address': '서울특별시 중구 세종대로 110',
    'pickup.detailAddress': '테스트 상차장 1번 출입구',
    'pickup.region': '서울 중구',
    'pickup.latitude': 37.5663,
    'pickup.longitude': 126.9779,
    'pickup.contactName': '테스트 상차 담당자',
    'pickup.contactPhone': '010-0000-0000',
    'dropoff.address': '부산광역시 연제구 중앙대로 1001',
    'dropoff.detailAddress': '테스트 하차장 2번 출입구',
    'dropoff.region': '부산 연제구',
    'dropoff.latitude': 35.1796,
    'dropoff.longitude': 129.0756,
    'dropoff.contactName': '테스트 하차 담당자',
    'dropoff.contactPhone': '010-0000-0000',
    pickupAt: koreanDateTime(24),
    arriveBy: koreanDateTime(30),
    'cargo.itemName': '[테스트] 박스 화물',
    'cargo.cargoType': 'GENERAL',
    'cargo.weightKg': 500,
    'cargo.quantity': 10,
    'cargo.packageUnit': 'BOX',
    'cargo.widthCm': 100,
    'cargo.depthCm': 80,
    'cargo.heightCm': 100,
    'cargo.fragile': true,
    'cargo.noStack': false,
    requiredVehicleType: 'TON_1',
    bodyType: 'CARGO',
    loadingMethod: 'FORKLIFT',
    memo: '테스트 입력입니다. 실제 운송 요청이 아닙니다.',
    fare: 200000,
  };
}

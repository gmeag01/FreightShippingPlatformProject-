import OrderMap from './OrderMap';

// 수락 전 시·구 이름 두 개(pickupRegion, dropoffRegion)로 대략 영역 지도를 그리는 래퍼 컴포넌트.
export default function RegionApproximateMap({ pickupRegion, dropoffRegion }) {
  return <OrderMap pickupRegion={pickupRegion} dropoffRegion={dropoffRegion} />;
}

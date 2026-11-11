import { useEffect, useRef, useState } from 'react';

const KAKAO_SDK_ID = 'kakao-map-sdk-script';
const APPROXIMATE_RADIUS_METERS = 3500;

// CSS 변수(@theme)에서 색상 값을 읽어 온다.
function readThemeColor(variableName) {
  return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
}

// 카카오맵 스크립트를 한 번만 불러오고 준비되면 window.kakao.maps를 돌려준다.
function loadKakaoMaps(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.kakao?.maps?.services) {
      resolve(window.kakao.maps);
      return;
    }
    const existing = document.getElementById(KAKAO_SDK_ID);
    if (existing) {
      existing.addEventListener('load', () =>
        window.kakao.maps.load(() => resolve(window.kakao.maps)),
      );
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.id = KAKAO_SDK_ID;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(apiKey)}&libraries=services&autoload=false`;
    script.onload = () => window.kakao.maps.load(() => resolve(window.kakao.maps));
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// 시·구 이름 하나를 카카오 주소 검색으로 좌표로 바꾼다.
function geocodeRegion(geocoder, kakaoMaps, regionName) {
  return new Promise((resolve, reject) => {
    geocoder.addressSearch(regionName, (result, status) => {
      if (status === kakaoMaps.services.Status.OK && result[0]) {
        resolve(new kakaoMaps.LatLng(Number(result[0].y), Number(result[0].x)));
        return;
      }
      reject(new Error('REGION_GEOCODE_FAILED'));
    });
  });
}

// 지도 위에 상차지(파란 원) 또는 하차지(ink 사각형) 이름표를 올린다.
function drawPointOverlay(map, kakaoMaps, position, label, isPickup) {
  const wrapper = document.createElement('div');
  wrapper.className = 'flex items-center gap-1.5';

  const badge = document.createElement('div');
  badge.className =
    'inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-card px-3 py-1 text-caption font-bold text-ink';

  const marker = document.createElement('span');
  marker.className = isPickup
    ? 'size-2.5 shrink-0 rounded-full bg-primary'
    : 'size-2.5 shrink-0 bg-ink';

  const text = document.createElement('span');
  text.textContent = label;
  badge.append(marker, text);
  wrapper.append(badge);

  const overlay = new kakaoMaps.CustomOverlay({
    position,
    content: wrapper,
    yAnchor: 0.5,
  });
  overlay.setMap(map);
}

// 지도 위에 시·구 대략 영역 점선 원과 이름표를 올린다.
function drawRegionCircle(map, kakaoMaps, position, label, isPickup) {
  const strokeColor = readThemeColor(isPickup ? '--color-primary' : '--color-ink');
  const fillColor = readThemeColor(isPickup ? '--color-line' : '--color-line-strong');
  const circle = new kakaoMaps.Circle({
    center: position,
    radius: APPROXIMATE_RADIUS_METERS,
    strokeWeight: 2,
    strokeColor,
    strokeOpacity: 0.75,
    strokeStyle: 'dashed',
    fillColor,
    fillOpacity: 0.45,
  });
  circle.setMap(map);
  drawPointOverlay(map, kakaoMaps, position, label, isPickup);
}

// 유효한 위도·경도 좌표 쌍인지 확인한다.
function hasExactCoordinates(point) {
  return (
    point != null &&
    point.latitude !== '' &&
    point.longitude !== '' &&
    Number.isFinite(Number(point.latitude)) &&
    Number.isFinite(Number(point.longitude))
  );
}

// 카카오맵 키가 없거나 불러오지 못했을 때 시안(shipper-order-detail.png, driver-order-detail.png) 모양으로 표시한다.
function FallbackMapCanvas({ isExactMode, pickupLabel, dropoffLabel }) {
  return (
    <div
      role="img"
      aria-label={`상차 ${pickupLabel}, 하차 ${dropoffLabel} 지도 안내`}
      className="border-line bg-ground relative h-52 w-full overflow-hidden rounded-lg border"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 600 220"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <path d="M460,0 Q490,85 600,100 L600,0 Z" className="fill-line" />
        <path d="M0,165 Q95,175 140,220 L0,220 Z" className="fill-line" />
        <line x1="0" y1="78" x2="600" y2="54" className="stroke-card" strokeWidth="5" />
        <line x1="0" y1="152" x2="600" y2="126" className="stroke-card" strokeWidth="5" />
        <line x1="190" y1="0" x2="155" y2="220" className="stroke-card" strokeWidth="4" />
        <line x1="395" y1="0" x2="365" y2="220" className="stroke-card" strokeWidth="4" />
      </svg>

      {isExactMode ? (
        <>
          <div className="absolute top-10 left-[12%] flex items-center gap-2 sm:left-[16%]">
            <span className="border-line-strong bg-card text-caption text-ink inline-flex items-center gap-1.5 rounded-md border px-3 py-1 font-bold whitespace-nowrap">
              <span>{pickupLabel}</span>
            </span>
            <span
              aria-hidden="true"
              className="bg-primary size-3.5 shrink-0 rounded-full border-2 border-white"
            />
          </div>
          <div className="absolute right-[10%] bottom-10 flex items-center gap-2 sm:right-[16%]">
            <span aria-hidden="true" className="bg-ink size-3.5 shrink-0 border-2 border-white" />
            <span className="border-line-strong bg-card text-caption text-ink inline-flex items-center gap-1.5 rounded-md border px-3 py-1 font-bold whitespace-nowrap">
              <span>{dropoffLabel}</span>
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="border-primary/70 bg-primary/15 absolute top-6 left-[12%] flex size-24 items-center justify-center rounded-full border-2 border-dashed sm:left-[18%] sm:size-28">
            <span className="border-line-strong bg-card text-caption text-ink inline-flex items-center gap-1.5 rounded-md border px-3 py-1 font-bold whitespace-nowrap">
              <span aria-hidden="true" className="bg-primary size-2 shrink-0 rounded-full" />
              <span>{pickupLabel}</span>
            </span>
          </div>
          <div className="border-ink/60 bg-ink/10 absolute right-[10%] bottom-5 flex size-24 items-center justify-center rounded-full border-2 border-dashed sm:right-[18%] sm:size-28">
            <span className="border-line-strong bg-card text-caption text-ink inline-flex items-center gap-1.5 rounded-md border px-3 py-1 font-bold whitespace-nowrap">
              <span aria-hidden="true" className="bg-ink size-2 shrink-0" />
              <span>{dropoffLabel}</span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// 공통 지도 컴포넌트(로드맵 B 약속):
// - 정확한 좌표 두 개(pickup, dropoff)를 받으면 두 지점을 표시한다.
// - 시·구 이름 두 개(pickupRegion, dropoffRegion)를 받으면 대략 영역(점선 원)을 그린다.
// - 지도 키는 VITE_KAKAO_MAP_KEY에서 읽고, 불러오지 못하면 안내만 보여 준다.
export default function OrderMap({ pickup, dropoff, pickupRegion, dropoffRegion }) {
  const mapContainerRef = useRef(null);
  const apiKey = import.meta.env.VITE_KAKAO_MAP_KEY;
  const [sdkFailed, setSdkFailed] = useState(false);

  const isExactMode = hasExactCoordinates(pickup) && hasExactCoordinates(dropoff);
  const resolvedPickupRegion = pickupRegion ?? pickup?.region ?? '';
  const resolvedDropoffRegion = dropoffRegion ?? dropoff?.region ?? '';

  const pickupLabel = isExactMode
    ? `상차 ${resolvedPickupRegion || pickup?.address || '상차지'}`
    : resolvedPickupRegion || '-';
  const dropoffLabel = isExactMode
    ? `하차 ${resolvedDropoffRegion || dropoff?.address || '하차지'}`
    : resolvedDropoffRegion || '-';

  const canRenderLiveMap =
    Boolean(apiKey) &&
    !sdkFailed &&
    (isExactMode || (Boolean(resolvedPickupRegion) && Boolean(resolvedDropoffRegion)));

  useEffect(() => {
    if (!apiKey) return undefined;
    if (!isExactMode && (!resolvedPickupRegion || !resolvedDropoffRegion)) {
      return undefined;
    }

    let isCancelled = false;
    loadKakaoMaps(apiKey)
      .then(async (kakaoMaps) => {
        if (isCancelled || !mapContainerRef.current) return;

        let pickupPos;
        let dropoffPos;

        if (isExactMode) {
          pickupPos = new kakaoMaps.LatLng(Number(pickup.latitude), Number(pickup.longitude));
          dropoffPos = new kakaoMaps.LatLng(Number(dropoff.latitude), Number(dropoff.longitude));
        } else {
          const geocoder = new kakaoMaps.services.Geocoder();
          [pickupPos, dropoffPos] = await Promise.all([
            geocodeRegion(geocoder, kakaoMaps, resolvedPickupRegion),
            geocodeRegion(geocoder, kakaoMaps, resolvedDropoffRegion),
          ]);
        }

        if (isCancelled || !mapContainerRef.current) return;
        const map = new kakaoMaps.Map(mapContainerRef.current, {
          center: pickupPos,
          level: 10,
        });

        if (isExactMode) {
          drawPointOverlay(map, kakaoMaps, pickupPos, pickupLabel, true);
          drawPointOverlay(map, kakaoMaps, dropoffPos, dropoffLabel, false);
        } else {
          drawRegionCircle(map, kakaoMaps, pickupPos, pickupLabel, true);
          drawRegionCircle(map, kakaoMaps, dropoffPos, dropoffLabel, false);
        }

        const bounds = new kakaoMaps.LatLngBounds();
        bounds.extend(pickupPos);
        bounds.extend(dropoffPos);
        map.setBounds(bounds, 48, 48, 48, 48);
        setSdkFailed(false);
      })
      .catch(() => {
        if (!isCancelled) setSdkFailed(true);
      });

    return () => {
      isCancelled = true;
    };
  }, [
    apiKey,
    isExactMode,
    pickup?.latitude,
    pickup?.longitude,
    dropoff?.latitude,
    dropoff?.longitude,
    resolvedPickupRegion,
    resolvedDropoffRegion,
    pickupLabel,
    dropoffLabel,
  ]);

  return (
    <div className="flex flex-col gap-2">
      {canRenderLiveMap ? (
        <div
          ref={mapContainerRef}
          aria-label={isExactMode ? '상차지 및 하차지 위치 지도' : '운송 구간 대략 영역 지도'}
          className="border-line bg-ground h-52 w-full overflow-hidden rounded-lg border"
        />
      ) : (
        <FallbackMapCanvas
          isExactMode={isExactMode}
          pickupLabel={pickupLabel}
          dropoffLabel={dropoffLabel}
        />
      )}
      {!canRenderLiveMap && (
        <p className="text-caption text-muted">
          {!isExactMode
            ? '상세주소와 연락처는 배차가 완료되면 표시됩니다.'
            : '카카오맵 키(VITE_KAKAO_MAP_KEY)가 설정되지 않았거나 지도를 불러오지 못해 구간 위치 안내로 대신 표시합니다.'}
        </p>
      )}
      {canRenderLiveMap && !isExactMode && (
        <p className="text-caption text-muted">상세주소와 연락처는 배차가 완료되면 표시됩니다.</p>
      )}
    </div>
  );
}

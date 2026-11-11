import { useEffect, useRef, useState } from 'react';
import { estimateFare, geocodeAddress } from '../../api/fare';
import { formatNumber, VEHICLE_LABELS } from '../../order/presentation';

const DAUM_POSTCODE_SCRIPT_URL =
  'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

const MAX_STANDARD_WEIGHT_KG = 25000;

let postcodeScriptPromise = null;

// 다음 우편번호 스크립트를 한 번만 불러온다.
function loadDaumPostcodeScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('브라우저 환경에서만 주소 검색을 사용할 수 있습니다.'));
  }
  if (window.daum?.Postcode) {
    return Promise.resolve(window.daum.Postcode);
  }
  if (postcodeScriptPromise) {
    return postcodeScriptPromise;
  }

  postcodeScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = DAUM_POSTCODE_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      if (window.daum?.Postcode) {
        resolve(window.daum.Postcode);
      } else {
        postcodeScriptPromise = null;
        reject(new Error('다음 우편번호 스크립트를 초기화하지 못했습니다.'));
      }
    };
    script.onerror = () => {
      postcodeScriptPromise = null;
      reject(new Error('다음 우편번호 스크립트를 불러오지 못했습니다.'));
    };
    document.head.appendChild(script);
  });

  return postcodeScriptPromise;
}

// 중량(kg)으로 추천 차종 코드를 계산한다.
function selectVehicleTypeByWeight(weightKg) {
  const weight = Number(weightKg);
  if (!Number.isFinite(weight) || weight <= 0) return null;
  if (weight <= 1000) return 'TON_1';
  if (weight <= 2500) return 'TON_2_5';
  if (weight <= 5000) return 'TON_5';
  if (weight <= 11000) return 'TON_11';
  return 'TON_25';
}

// 다음 우편번호 검색창과 주소→좌표 변환(Geocode)을 제공하는 버튼 모음.
export function GeocodeButton({ name, onCoordinatesChange }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const inFlight = useRef(false);

  async function lookupCoordinates(form, targetAddress) {
    const field = (key) => form.elements.namedItem(`${name}.${key}`);
    const address = (targetAddress ?? field('address')?.value ?? '').trim();
    if (!address) {
      setMessage('주소를 먼저 입력해 주세요.');
      return;
    }
    if (inFlight.current) return;

    inFlight.current = true;
    setBusy(true);
    setMessage('');
    try {
      const result = await geocodeAddress(address);
      if (field('address').value.trim() !== address) {
        setMessage('주소가 바뀌었습니다. 다시 조회해 주세요.');
        return;
      }
      if (
        !Number.isFinite(result.latitude) ||
        !Number.isFinite(result.longitude) ||
        Math.abs(result.latitude) > 90 ||
        Math.abs(result.longitude) > 180 ||
        (result.latitude === 37.5665 && result.longitude === 126.978)
      ) {
        setMessage(
          '정확한 위치를 확인하지 못했습니다. 지도 키 설정을 확인하거나 좌표를 직접 입력해 주세요.',
        );
        return;
      }
      field('latitude').value = result.latitude;
      field('longitude').value = result.longitude;
      onCoordinatesChange();
      setMessage('위치를 채웠습니다. 주소와 일치하는지 확인해 주세요.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function handleSearchPostcode(event) {
    const form = event.currentTarget.form;
    if (!form) return;
    setMessage('');
    try {
      const Postcode = await loadDaumPostcodeScript();
      new Postcode({
        oncomplete: (data) => {
          const roadOrJibun = (data.roadAddress || data.jibunAddress || data.address || '').trim();
          const regionText = [data.sido, data.sigungu].filter(Boolean).join(' ').trim();
          const addressInput = form.elements.namedItem(`${name}.address`);
          const regionInput = form.elements.namedItem(`${name}.region`);
          const detailInput = form.elements.namedItem(`${name}.detailAddress`);

          if (addressInput && roadOrJibun) {
            addressInput.value = roadOrJibun;
          }
          if (regionInput && regionText) {
            regionInput.value = regionText;
          }
          onCoordinatesChange();
          if (roadOrJibun) {
            lookupCoordinates(form, roadOrJibun);
          }
          detailInput?.focus();
        },
      }).open();
    } catch (error) {
      setMessage(error.message || '주소 검색 창을 열지 못했습니다.');
    }
  }

  function handleLocateClick(event) {
    const form = event.currentTarget.form;
    if (!form) return;
    lookupCoordinates(form);
  }

  return (
    <div className="mb-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={handleSearchPostcode}
          className="border-line-strong bg-card text-ink inline-flex min-h-11 items-center justify-center rounded-md border px-3.5 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
        >
          주소 검색 (우편번호)
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={handleLocateClick}
          className="border-line-strong bg-card text-primary-dark inline-flex min-h-11 items-center justify-center rounded-md border px-3.5 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
        >
          {busy ? '위치 조회 중…' : '주소로 위치 찾기'}
        </button>
      </div>
      {message && (
        <p role="status" className="text-muted mt-2 text-sm">
          {message}
        </p>
      )}
    </div>
  );
}

// 현재 폼 입력값을 읽어 견적 API 요청 본문과 중량 상태를 만든다.
function readEstimateCommandFromForm(form) {
  if (!form) return { ready: false, weightKg: 0, command: null, snapshotKey: '' };
  const fields = new FormData(form);
  const pickupLatRaw = fields.get('pickup.latitude');
  const pickupLngRaw = fields.get('pickup.longitude');
  const dropoffLatRaw = fields.get('dropoff.latitude');
  const dropoffLngRaw = fields.get('dropoff.longitude');
  const weightRaw = fields.get('cargo.weightKg');
  const pickupAt = fields.get('pickupAt');
  const vehicleType = fields.get('requiredVehicleType');
  const loadingMethod = fields.get('loadingMethod');

  const weightKg = Number(weightRaw);
  const hasAllRequired =
    pickupLatRaw !== null &&
    pickupLatRaw !== '' &&
    pickupLngRaw !== null &&
    pickupLngRaw !== '' &&
    dropoffLatRaw !== null &&
    dropoffLatRaw !== '' &&
    dropoffLngRaw !== null &&
    dropoffLngRaw !== '' &&
    Number.isFinite(weightKg) &&
    weightKg > 0 &&
    Boolean(pickupAt) &&
    Boolean(loadingMethod);

  if (!hasAllRequired) {
    return { ready: false, weightKg, command: null, snapshotKey: '' };
  }

  const command = {
    pickupLat: Number(pickupLatRaw),
    pickupLng: Number(pickupLngRaw),
    dropoffLat: Number(dropoffLatRaw),
    dropoffLng: Number(dropoffLngRaw),
    weightKg,
    pickupAt: String(pickupAt),
    vehicleType: vehicleType ? String(vehicleType) : selectVehicleTypeByWeight(weightKg),
    loadingMethod: String(loadingMethod),
  };

  const snapshotKey = [
    command.pickupLat,
    command.pickupLng,
    command.dropoffLat,
    command.dropoffLng,
    command.weightKg,
    command.pickupAt,
    command.vehicleType,
    command.loadingMethod,
  ].join('|');

  return { ready: true, weightKg, command, snapshotKey };
}

// 상하차 좌표, 중량, 상차 일시, 상하차 방법이 채워지면 추천 운임과 계산 내역을 보여 준다.
export function FareEstimatePanel({ formRef, onEstimate }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [overweight, setOverweight] = useState(false);
  const [appliedNotice, setAppliedNotice] = useState('');
  const inFlight = useRef(false);

  async function runEstimate({ silentWhenIncomplete = false } = {}) {
    const form = formRef.current;
    if (!form || inFlight.current) return;

    const { ready, weightKg, command, snapshotKey } = readEstimateCommandFromForm(form);
    setOverweight(Number.isFinite(weightKg) && weightKg > MAX_STANDARD_WEIGHT_KG);

    if (!ready) {
      if (!silentWhenIncomplete) {
        setError('상하차 좌표, 중량, 상차 시각과 차량 조건을 먼저 입력해 주세요.');
      }
      return;
    }

    inFlight.current = true;
    setBusy(true);
    setError('');
    setAppliedNotice('');
    try {
      const response = await estimateFare(command);
      const latest = readEstimateCommandFromForm(formRef.current);
      if (latest.snapshotKey !== snapshotKey) {
        if (!silentWhenIncomplete) {
          setError('입력 조건이 바뀌었습니다. 다시 계산해 주세요.');
        }
        return;
      }
      setResult(response);
      onEstimate(response);
    } catch (failure) {
      setError(failure.message || '추천 운임을 계산하지 못했습니다.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  // 마운트 시(또는 조건이 바뀌어 패널이 재생성될 때) 필수 입력이 모두 채워져 있으면 자동 계산한다.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return undefined;

    const weightInput = form.elements.namedItem('cargo.weightKg');
    const vehicleSelect = form.elements.namedItem('requiredVehicleType');
    const currentWeight = Number(weightInput?.value);
    setOverweight(Number.isFinite(currentWeight) && currentWeight > MAX_STANDARD_WEIGHT_KG);

    const handleWeightChange = (event) => {
      const nextWeight = Number(event.target.value);
      setOverweight(Number.isFinite(nextWeight) && nextWeight > MAX_STANDARD_WEIGHT_KG);
      const recommendedType = selectVehicleTypeByWeight(nextWeight);
      if (
        recommendedType &&
        vehicleSelect &&
        vehicleSelect.dataset.userModified !== 'true' &&
        vehicleSelect.value !== recommendedType
      ) {
        vehicleSelect.value = recommendedType;
      }
    };

    const handleVehicleChange = () => {
      if (vehicleSelect) {
        vehicleSelect.dataset.userModified = 'true';
      }
    };

    weightInput?.addEventListener('change', handleWeightChange);
    vehicleSelect?.addEventListener('change', handleVehicleChange);

    const timer = setTimeout(() => {
      runEstimate({ silentWhenIncomplete: true });
    }, 250);

    return () => {
      clearTimeout(timer);
      weightInput?.removeEventListener('change', handleWeightChange);
      vehicleSelect?.removeEventListener('change', handleVehicleChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formRef]);

  function handleApplyRecommendedFare() {
    if (!result || !formRef.current) return;
    const fareInput = formRef.current.elements.namedItem('fare');
    if (!fareInput) return;
    fareInput.value = String(result.recommendedFare);
    fareInput.dispatchEvent(new Event('change', { bubbles: true }));
    setAppliedNotice(`추천 운임 ${formatNumber(result.recommendedFare)}원을 운임 칸에 넣었습니다.`);
  }

  const recommendedVehicleLabel = result
    ? (VEHICLE_LABELS[result.recommendedVehicleType] ?? result.recommendedVehicleType)
    : '';
  const surchargeSummary =
    result?.appliedSurcharges?.length > 0 ? ` (${result.appliedSurcharges.join(', ')})` : '';

  return (
    <div className="bg-primary-soft mt-4 rounded-lg border border-blue-200 p-4">
      {overweight && (
        <div
          role="alert"
          className="bg-signal-soft text-signal-ink mb-3 rounded-md border border-orange-300 px-3.5 py-2.5 text-sm font-medium"
        >
          중량이 25톤(25,000kg)을 넘습니다. 최대 차종인 25톤 기준으로 계산되며 배차가 어려울 수
          있습니다.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => runEstimate({ silentWhenIncomplete: false })}
          disabled={busy}
          className="bg-primary hover:bg-primary-dark inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? '운임 계산 중…' : '추천 운임 계산'}
        </button>

        {result && (
          <button
            type="button"
            onClick={handleApplyRecommendedFare}
            className="border-line-strong bg-card text-primary-dark inline-flex min-h-11 items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            추천 운임 적용
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-danger mt-2 text-sm">
          {error}
        </p>
      )}

      {appliedNotice && (
        <p role="status" className="text-primary-dark mt-2 text-sm font-medium">
          {appliedNotice}
        </p>
      )}

      {result && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-ink text-base font-bold tabular-nums sm:text-lg">
            추천 차종 {recommendedVehicleLabel} · {formatNumber(result.distanceKm)}km · 추천 운임{' '}
            {formatNumber(result.recommendedFare)}원{surchargeSummary}
          </p>

          {result.isDistanceEstimated && (
            <p className="text-signal-ink font-medium">거리는 추정값입니다</p>
          )}

          <p className="text-copy tabular-nums">
            계산 내역: 기본요금 {formatNumber(result.baseFare)}원 + 거리 요금{' '}
            {formatNumber(result.distanceFare)}원 + 할증 금액 {formatNumber(result.surchargeAmount)}
            원
          </p>

          {result.appliedSurcharges?.length > 0 && (
            <p className="text-copy">적용된 할증: {result.appliedSurcharges.join(', ')}</p>
          )}

          <p className="text-muted">
            추천 운임 적용 버튼을 누르거나 최종 운임을 직접 입력할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}

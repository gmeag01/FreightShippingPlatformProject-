import { useRef, useState } from 'react';
import { estimateFare, geocodeAddress } from '../../api/orderIntegration';
import { formatNumber, VEHICLE_LABELS } from '../../order/presentation';

// 주소 변환이 실패했을 때 서버가 보내는 기본 위치는 실제 주소로 적용하지 않는다.
export function GeocodeButton({ name, onCoordinatesChange }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const inFlight = useRef(false);
  async function locate(event) {
    if (inFlight.current) return;
    const form = event.currentTarget.form;
    const field = (key) => form.elements.namedItem(`${name}.${key}`);
    const address = field('address').value.trim();
    if (!address) {
      setMessage('주소를 먼저 입력해 주세요.');
      return;
    }
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
  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={busy}
        onClick={locate}
        className="border-line-strong bg-card text-primary-dark rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {busy ? '위치 조회 중…' : '주소로 위치 찾기'}
      </button>
      {message && (
        <p role="status" className="text-muted mt-2 text-sm">
          {message}
        </p>
      )}
    </div>
  );
}

// 현재 입력 조건으로 B API의 추천 운임과 계산 내역을 조회한다. 조건 변경 시 패널을 새로 만든다.
export function FareEstimatePanel({ formRef, onEstimate }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  async function calculate() {
    if (inFlight.current) return;
    const fields = new FormData(formRef.current);
    const names = [
      'pickup.latitude',
      'pickup.longitude',
      'dropoff.latitude',
      'dropoff.longitude',
      'cargo.weightKg',
      'pickupAt',
      'requiredVehicleType',
      'loadingMethod',
    ];
    const snapshot = names.map((name) => fields.get(name));
    if (snapshot.some((value) => value == null || value === '') || Number(snapshot[4]) <= 0) {
      setError('상하차 좌표, 중량, 상차 시각과 차량 조건을 먼저 입력해 주세요.');
      return;
    }
    const command = {
      pickupLat: Number(snapshot[0]),
      pickupLng: Number(snapshot[1]),
      dropoffLat: Number(snapshot[2]),
      dropoffLng: Number(snapshot[3]),
      weightKg: Number(snapshot[4]),
      pickupAt: snapshot[5],
      vehicleType: snapshot[6],
      loadingMethod: snapshot[7],
    };
    inFlight.current = true;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const response = await estimateFare(command);
      const latest = new FormData(formRef.current);
      if (names.some((name, index) => latest.get(name) !== snapshot[index])) {
        setError('입력 조건이 바뀌었습니다. 다시 계산해 주세요.');
        return;
      }
      setResult(response);
      onEstimate(response);
    } catch (failure) {
      setError(failure.message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="bg-primary-soft mt-4 rounded-lg p-4">
      <button
        type="button"
        onClick={calculate}
        disabled={busy}
        className="bg-primary rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? '운임 계산 중…' : '추천 운임 계산'}
      </button>
      {error && (
        <p role="alert" className="text-danger mt-2 text-sm">
          {error}
        </p>
      )}
      {result && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-ink text-lg font-bold">
            추천 운임 {formatNumber(result.recommendedFare)}원
          </p>
          <p>
            추천 차량: {VEHICLE_LABELS[result.recommendedVehicleType]} · 거리{' '}
            {formatNumber(result.distanceKm)}km
          </p>
          {result.isDistanceEstimated && <p className="text-signal-ink">거리는 추정값입니다.</p>}
          <p>
            기본 {formatNumber(result.baseFare)}원 + 거리 {formatNumber(result.distanceFare)}원 +
            할증 {formatNumber(result.surchargeAmount)}원
          </p>
          {result.appliedSurcharges?.length > 0 && (
            <p>적용 할증: {result.appliedSurcharges.join(', ')}</p>
          )}
          <p className="text-muted">추천값을 참고해 최종 운임을 직접 입력해 주세요.</p>
        </div>
      )}
    </div>
  );
}

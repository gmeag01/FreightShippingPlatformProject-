import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyVehicle, registerMyVehicle, updateMyVehicle } from '../api/vehicle';
import { BODY_LABELS, VEHICLE_LABELS, VEHICLE_MAX_LOAD, formatAmount } from '../utils/driverOrder';

const CARD_CLASS = 'rounded-lg border border-line bg-card p-5 sm:p-6';
const INPUT_CLASS =
  'mt-1.5 min-h-11 w-full rounded-md border border-line-strong bg-white px-3.5 py-2 text-body text-ink focus:border-primary focus:outline-2 focus:outline-blue-200';
const PRIMARY_BUTTON_CLASS =
  'inline-flex min-h-11 items-center justify-center rounded-md border border-transparent bg-primary px-5 font-semibold whitespace-nowrap text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-muted';
const SECONDARY_BUTTON_CLASS =
  'inline-flex min-h-11 items-center justify-center rounded-md border border-line-strong bg-white px-4.5 font-semibold whitespace-nowrap text-copy hover:bg-slate-50';

const VEHICLE_OPTIONS = Object.entries(VEHICLE_LABELS);
const BODY_OPTIONS = Object.entries(BODY_LABELS);

// 차주 전용 내 차량 등록 및 수정 화면 (/driver/vehicle).
export default function DriverVehiclePage() {
  const [hasExistingVehicle, setHasExistingVehicle] = useState(false);
  const [vehicleType, setVehicleType] = useState('TON_5');
  const [plateNumber, setPlateNumber] = useState('');
  const [bodyType, setBodyType] = useState('CARGO');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);
  const [plateError, setPlateError] = useState('');

  useEffect(() => {
    let active = true;
    getMyVehicle()
      .then((vehicle) => {
        if (!active) return;
        if (vehicle && vehicle.vehicleType) {
          setHasExistingVehicle(true);
          setVehicleType(vehicle.vehicleType);
          setPlateNumber(vehicle.plateNumber ?? '');
          setBodyType(vehicle.bodyType ?? 'CARGO');
        } else {
          setHasExistingVehicle(false);
        }
      })
      .catch((error) => {
        if (!active) return;
        setBanner({
          type: 'error',
          text: error.message || '차량 정보를 불러오지 못했습니다.',
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const maxLoadKg = VEHICLE_MAX_LOAD[vehicleType] ?? 0;

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedPlate = plateNumber.trim();
    if (!trimmedPlate) {
      setPlateError('차량번호를 입력해 주세요.');
      return;
    }
    setPlateError('');
    setBanner(null);
    setSaving(true);

    const payload = {
      vehicleType,
      plateNumber: trimmedPlate,
      bodyType,
    };

    try {
      const saved = hasExistingVehicle
        ? await updateMyVehicle(payload)
        : await registerMyVehicle(payload);

      setHasExistingVehicle(true);
      if (saved) {
        setVehicleType(saved.vehicleType ?? vehicleType);
        setPlateNumber(saved.plateNumber ?? trimmedPlate);
        setBodyType(saved.bodyType ?? bodyType);
      }
      setBanner({
        type: 'success',
        text: hasExistingVehicle ? '차량 정보를 수정했습니다.' : '내 차량을 등록했습니다.',
      });
    } catch (error) {
      if (error.fieldErrors?.plateNumber) {
        setPlateError(error.fieldErrors.plateNumber);
      }
      setBanner({
        type: 'error',
        text: error.message || '차량 정보를 저장하지 못했습니다.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto flex max-w-xl flex-col gap-5 break-keep">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-h1-sm sm:text-h1 text-ink font-bold">내 차량</h1>
          <p className="text-muted mt-1 text-sm">
            {hasExistingVehicle
              ? '등록된 차량 정보를 확인하고 수정할 수 있습니다.'
              : '의뢰를 수락하려면 먼저 운행할 차량을 등록해 주세요.'}
          </p>
        </div>
        {hasExistingVehicle && (
          <span className="bg-primary-soft text-caption inline-flex min-h-6 items-center rounded-sm border border-blue-200 px-2.5 font-semibold text-blue-900">
            등록 완료
          </span>
        )}
      </div>

      {banner && (
        <div
          role={banner.type === 'error' ? 'alert' : 'status'}
          className={`rounded-lg border px-4 py-3.5 text-sm ${
            banner.type === 'success'
              ? 'bg-primary-soft border-blue-200 text-blue-900'
              : 'bg-danger-soft border-red-200 text-red-800'
          }`}
        >
          {banner.text}
        </div>
      )}

      {loading ? (
        <div className={`${CARD_CLASS} text-muted py-12 text-center text-sm`}>
          차량 정보를 불러오는 중입니다…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={`${CARD_CLASS} flex flex-col gap-5`} noValidate>
          <div>
            <label htmlFor="vehicleType" className="text-body text-copy block font-semibold">
              차종
            </label>
            <select
              id="vehicleType"
              name="vehicleType"
              value={vehicleType}
              onChange={(event) => setVehicleType(event.target.value)}
              disabled={saving}
              className={INPUT_CLASS}
            >
              {VEHICLE_OPTIONS.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="plateNumber" className="text-body text-copy block font-semibold">
              차량번호
            </label>
            <input
              id="plateNumber"
              name="plateNumber"
              type="text"
              maxLength={20}
              placeholder="예: 80가1234"
              value={plateNumber}
              onChange={(event) => {
                setPlateNumber(event.target.value);
                if (plateError) setPlateError('');
              }}
              disabled={saving}
              aria-invalid={Boolean(plateError)}
              aria-describedby={plateError ? 'plateNumber-error' : undefined}
              className={`${INPUT_CLASS} font-mono`}
            />
            {plateError && (
              <p id="plateNumber-error" className="text-danger mt-1.5 text-xs font-medium">
                {plateError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="bodyType" className="text-body text-copy block font-semibold">
              적재함 형태
            </label>
            <select
              id="bodyType"
              name="bodyType"
              value={bodyType}
              onChange={(event) => setBodyType(event.target.value)}
              disabled={saving}
              className={INPUT_CLASS}
            >
              {BODY_OPTIONS.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="border-line rounded-md border bg-slate-50 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-caption text-subtle font-medium">최대 적재량 안내</span>
              <span className="text-body text-ink font-bold tabular-nums">
                {formatAmount(maxLoadKg)}kg
              </span>
            </div>
            <p className="text-caption text-muted mt-1">
              차종에 따라 최대 적재량이 자동으로 결정됩니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
            <Link to="/driver/orders" className={SECONDARY_BUTTON_CLASS}>
              의뢰 목록으로
            </Link>
            <button type="submit" disabled={saving} className={PRIMARY_BUTTON_CLASS}>
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

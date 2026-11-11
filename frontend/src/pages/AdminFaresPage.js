import { useEffect, useState } from 'react';
import { fetchAdminFareTable, updateAdminFareRates, updateAdminFareSurcharges } from '../api/fare';
import { VEHICLE_LABELS, VEHICLE_MAX_LOAD, formatAmount } from '../utils/driverOrder';

const CARD_CLASS = 'rounded-lg border border-line bg-card p-5 sm:p-6';
const TABLE_INPUT_CLASS =
  'min-h-11 w-full max-w-44 rounded-md border border-line-strong bg-white px-3 py-1.5 text-right text-body font-semibold text-ink tabular-nums focus:border-primary focus:outline-2 focus:outline-blue-200';
const SURCHARGE_INPUT_CLASS =
  'mt-2 min-h-11 w-full rounded-md border border-line-strong bg-white px-3 py-1.5 text-right text-body font-semibold text-ink tabular-nums focus:border-primary focus:outline-2 focus:outline-blue-200';
const PRIMARY_BUTTON_CLASS =
  'inline-flex min-h-11 w-full items-center justify-center rounded-md border border-transparent bg-primary px-5 font-semibold whitespace-nowrap text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-muted';

const VEHICLE_ORDER = ['TON_1', 'TON_2_5', 'TON_5', 'TON_11', 'TON_25'];

const SURCHARGE_META = [
  {
    type: 'NIGHT',
    label: '야간 할증률 (%)',
    description: '22시~06시 상차',
    defaultPercent: 20,
  },
  {
    type: 'WEEKEND',
    label: '주말 할증률 (%)',
    description: '토·일요일 상차',
    defaultPercent: 10,
  },
  {
    type: 'MANUAL_LOADING',
    label: '수작업 할증률 (%)',
    description: '상하차 방법이 수작업',
    defaultPercent: 15,
  },
  {
    type: 'URGENT',
    label: '긴급 할증률 (%)',
    description: '등록 후 24시간 이내 상차',
    defaultPercent: 30,
  },
];

const EXAMPLE_DISTANCE_KM = 390;

// 소수 할증률(예: 0.20)을 화면 표시용 퍼센트 숫자(20)로 변환한다.
function toPercentValue(rate, fallbackPercent) {
  const num = Number(rate);
  if (!Number.isFinite(num)) return fallbackPercent;
  return Math.round(num * 10000) / 100;
}

// 관리자 전용 운임 단가표·할증률 관리 화면 (시안: docs/design/screens/admin-fares.png).
export default function AdminFaresPage() {
  const [rates, setRates] = useState([]);
  const [surcharges, setSurcharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    let active = true;
    fetchAdminFareTable()
      .then((data) => {
        if (!active) return;
        const rateMap = new Map((data?.rates ?? []).map((item) => [item.vehicleType, item]));
        const normalizedRates = VEHICLE_ORDER.map((vehicleType) => {
          const found = rateMap.get(vehicleType);
          return {
            vehicleType,
            maxLoadKg: found?.maxLoadKg ?? VEHICLE_MAX_LOAD[vehicleType],
            baseFare: found?.baseFare ?? 0,
            perKmFare: found?.perKmFare ?? 0,
          };
        });

        const surchargeMap = new Map((data?.surcharges ?? []).map((item) => [item.type, item]));
        const normalizedSurcharges = SURCHARGE_META.map((meta) => {
          const found = surchargeMap.get(meta.type);
          return {
            type: meta.type,
            enabled: found?.enabled ?? true,
            percent: toPercentValue(found?.rate, meta.defaultPercent),
          };
        });

        setRates(normalizedRates);
        setSurcharges(normalizedSurcharges);
      })
      .catch((error) => {
        if (!active) return;
        setBanner({
          type: 'error',
          text: error.message || '운임 단가표를 불러오지 못했습니다.',
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function handleRateChange(vehicleType, field, rawValue) {
    setRates((prev) =>
      prev.map((row) => (row.vehicleType === vehicleType ? { ...row, [field]: rawValue } : row)),
    );
  }

  function handleSurchargeChange(type, rawValue) {
    setSurcharges((prev) =>
      prev.map((item) => (item.type === type ? { ...item, percent: rawValue } : item)),
    );
  }

  async function handleSave(event) {
    event.preventDefault();
    setBanner(null);

    const parsedRates = rates.map((row) => ({
      vehicleType: row.vehicleType,
      baseFare: Number(row.baseFare),
      perKmFare: Number(row.perKmFare),
    }));

    if (
      parsedRates.some(
        (row) =>
          !Number.isFinite(row.baseFare) ||
          row.baseFare < 0 ||
          !Number.isFinite(row.perKmFare) ||
          row.perKmFare < 0,
      )
    ) {
      setBanner({
        type: 'error',
        text: '기본요금과 km당 단가는 0 이상의 숫자로 입력해 주세요.',
      });
      return;
    }

    const parsedSurcharges = surcharges.map((item) => {
      const percentNum = Number(item.percent);
      return {
        type: item.type,
        enabled: item.enabled ?? true,
        percentNum,
        rate: Number((percentNum / 100).toFixed(4)),
      };
    });

    if (
      parsedSurcharges.some(
        (item) => !Number.isFinite(item.percentNum) || item.percentNum < 0 || item.percentNum > 100,
      )
    ) {
      setBanner({
        type: 'error',
        text: '할증률은 0%에서 100% 사이의 숫자로 입력해 주세요.',
      });
      return;
    }

    setSaving(true);
    try {
      await updateAdminFareRates(parsedRates);
      await updateAdminFareSurcharges(
        parsedSurcharges.map(({ type, enabled, rate }) => ({
          type,
          enabled,
          rate,
        })),
      );
      setBanner({
        type: 'success',
        text: '단가표와 할증률을 저장했습니다. 다음 추천 운임 계산부터 바로 적용됩니다.',
      });
    } catch (error) {
      setBanner({
        type: 'error',
        text: error.message || '단가표를 저장하지 못했습니다.',
      });
    } finally {
      setSaving(false);
    }
  }

  const ton5Row = rates.find((row) => row.vehicleType === 'TON_5');
  const exampleBaseFare = Math.max(0, Number(ton5Row?.baseFare) || 0);
  const examplePerKmFare = Math.max(0, Number(ton5Row?.perKmFare) || 0);
  const exampleDistanceFare = EXAMPLE_DISTANCE_KM * examplePerKmFare;
  const exampleRecommendedFare = Math.round((exampleBaseFare + exampleDistanceFare) / 1000) * 1000;

  return (
    <section className="flex flex-col gap-5 break-keep">
      <div>
        <h1 className="text-h1-sm sm:text-h1 text-ink font-bold">운임 단가표</h1>
        <p className="text-muted mt-1 text-sm">
          수정한 단가와 할증률은 다음 추천 운임 계산부터 바로 적용됩니다.
        </p>
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
          운임 단가표를 불러오는 중입니다…
        </div>
      ) : (
        <form
          onSubmit={handleSave}
          className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"
          noValidate
        >
          <div className="flex flex-col gap-5">
            {/* 차종별 단가 표 */}
            <section className="border-line bg-card overflow-x-auto rounded-lg border p-5 sm:p-6">
              <h2 className="text-h2 text-ink font-bold">차종별 단가</h2>
              <table className="text-body text-copy mt-4 w-full text-left">
                <thead className="border-line text-caption text-subtle border-b">
                  <tr>
                    <th scope="col" className="py-3 pr-4 font-semibold">
                      차종
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      최대 적재 (kg)
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      기본요금 (원)
                    </th>
                    <th scope="col" className="py-3 pl-4 font-semibold">
                      km당 단가 (원)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-line divide-y">
                  {rates.map((row) => {
                    const label = VEHICLE_LABELS[row.vehicleType] ?? row.vehicleType;
                    return (
                      <tr key={row.vehicleType}>
                        <td className="text-ink py-3.5 pr-4 font-bold whitespace-nowrap">
                          {label}
                        </td>
                        <td className="text-copy px-4 py-3.5 font-medium whitespace-nowrap tabular-nums">
                          {formatAmount(row.maxLoadKg)}
                        </td>
                        <td className="px-4 py-3.5">
                          <input
                            type="number"
                            min={0}
                            step={1000}
                            aria-label={`${label} 기본요금 (원)`}
                            value={row.baseFare}
                            onChange={(event) =>
                              handleRateChange(row.vehicleType, 'baseFare', event.target.value)
                            }
                            disabled={saving}
                            className={TABLE_INPUT_CLASS}
                          />
                        </td>
                        <td className="py-3.5 pl-4">
                          <input
                            type="number"
                            min={0}
                            step={100}
                            aria-label={`${label} km당 단가 (원)`}
                            value={row.perKmFare}
                            onChange={(event) =>
                              handleRateChange(row.vehicleType, 'perKmFare', event.target.value)
                            }
                            disabled={saving}
                            className={TABLE_INPUT_CLASS}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            {/* 할증률 카드 */}
            <section className={CARD_CLASS}>
              <h2 className="text-h2 text-ink font-bold">할증률</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {SURCHARGE_META.map((meta) => {
                  const current = surcharges.find((item) => item.type === meta.type);
                  return (
                    <div key={meta.type}>
                      <label
                        htmlFor={`surcharge-${meta.type}`}
                        className="text-caption text-copy block font-semibold"
                      >
                        {meta.label}
                      </label>
                      <p className="text-caption text-subtle mt-0.5">{meta.description}</p>
                      <input
                        id={`surcharge-${meta.type}`}
                        type="number"
                        min={0}
                        max={100}
                        step="any"
                        value={current?.percent ?? meta.defaultPercent}
                        onChange={(event) => handleSurchargeChange(meta.type, event.target.value)}
                        disabled={saving}
                        className={SURCHARGE_INPUT_CLASS}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* 우측 계산 예시 및 저장 사이드바 */}
          <aside className={`${CARD_CLASS} flex flex-col gap-4`}>
            <div>
              <h2 className="text-h2 text-ink font-bold">계산 예시</h2>
              <p className="text-caption text-muted mt-1">5톤 · 390km · 할증 없음</p>
            </div>

            <dl className="divide-line divide-y text-sm">
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-subtle">기본요금</dt>
                <dd className="text-ink font-semibold tabular-nums">
                  {formatAmount(exampleBaseFare)}원
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-subtle">
                  거리 요금 ({EXAMPLE_DISTANCE_KM}×{formatAmount(examplePerKmFare)})
                </dt>
                <dd className="text-ink font-semibold tabular-nums">
                  {formatAmount(exampleDistanceFare)}원
                </dd>
              </div>
              <div className="flex items-center justify-between pt-3">
                <dt className="text-ink font-semibold">추천 운임</dt>
                <dd className="text-fare text-ink font-bold tabular-nums">
                  {formatAmount(exampleRecommendedFare)}원
                </dd>
              </div>
            </dl>

            <button type="submit" disabled={saving} className={PRIMARY_BUTTON_CLASS}>
              {saving ? '저장 중…' : '단가표 저장'}
            </button>
          </aside>
        </form>
      )}
    </section>
  );
}

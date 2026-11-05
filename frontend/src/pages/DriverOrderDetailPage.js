import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchMyVehicle, fetchOpenOrderDetail } from '../api/matching';
import MismatchConfirmModal from '../components/MismatchConfirmModal';
import useAcceptOrder from '../hooks/useAcceptOrder';
import {
  BODY_LABELS,
  CARGO_TYPE_LABELS,
  LOADING_LABELS,
  PACKAGE_UNIT_LABELS,
  VEHICLE_LABELS,
  VEHICLE_MAX_LOAD,
  checkMyVehicleMismatch,
  formatDateTime,
} from '../utils/driverOrder';

// 정보 한 줄(제목과 값)을 그리는 작은 조각.
function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between gap-3 border-b border-gray-100 py-2 text-sm last:border-b-0">
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{value}</dd>
    </div>
  );
}

// 수락 전 의뢰 상세 화면. 주소는 시·구까지만 보이고, 정확한 주소와 연락처는 수락(배차) 뒤에 열린다.
export default function DriverOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [myVehicle, setMyVehicle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);
  const [banner, setBanner] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const { submittingId, mismatchModal, requestAccept, executeAccept, closeMismatchModal } =
    useAcceptOrder({
      onAccepted: async () => navigate('/driver/jobs'),
      // 화주가 오더를 고쳤으면 최신 내용을 다시 불러와 새 version으로 수락할 수 있게 한다.
      onOrderChanged: async () => {
        setBanner({
          type: 'error',
          text: '화주가 오더 내용을 수정했습니다. 최신 내용으로 다시 불러왔습니다.',
        });
        setReloadCount((count) => count + 1);
      },
      onOrderUnavailable: async (_order, error) => {
        setDetail(null);
        setLoadError(error.message);
      },
      onFailed: (error) => setBanner({ type: 'error', text: error.message }),
    });

  useEffect(() => {
    let isActive = true;
    fetchMyVehicle()
      .then((vehicle) => {
        if (isActive) setMyVehicle(vehicle);
      })
      .catch(() => {
        if (isActive) setMyVehicle(null);
      });
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    fetchOpenOrderDetail(id)
      .then((data) => {
        if (!isActive) return;
        setDetail(data);
        setLoadError(null);
      })
      .catch((error) => {
        if (!isActive) return;
        setDetail(null);
        setLoadError(error.message);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [id, reloadCount]);

  if (isLoading) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">의뢰 정보를 불러오는 중입니다...</p>
    );
  }

  if (!detail) {
    return (
      <section className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {loadError ?? '의뢰를 찾을 수 없습니다.'}
        </div>
        <Link to="/driver/orders" className="text-sm font-medium text-blue-600 hover:underline">
          의뢰 목록으로 돌아가기
        </Link>
      </section>
    );
  }

  const isSubmitting = submittingId === detail.id;
  const hasSize = detail.widthCm && detail.depthCm && detail.heightCm;
  const mismatchWarnings = checkMyVehicleMismatch(myVehicle, detail);
  const myMaxLoadKg = myVehicle?.vehicleType
    ? (myVehicle.maxLoadKg ?? VEHICLE_MAX_LOAD[myVehicle.vehicleType])
    : null;

  return (
    <section className="space-y-4">
      <Link to="/driver/orders" className="text-sm font-medium text-blue-600 hover:underline">
        ← 의뢰 목록
      </Link>

      {banner && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {banner.text}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-xs text-gray-500">운송 구간 (수락 전 시·구 대략 영역)</p>
        <p className="mt-1 text-lg font-bold text-gray-900">
          {detail.pickupRegion} → {detail.dropoffRegion}
        </p>
        <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-xs text-gray-600">
          {/* TODO(D): B 담당의 지도 컴포넌트 OrderMap이 합쳐지면 시·구 이름 두 개(pickupRegion, dropoffRegion)를 넘겨 대략 영역 지도를 그린다 */}
          <div className="flex items-center justify-between font-medium text-gray-800">
            <span>출발 권역: {detail.pickupRegion}</span>
            <span>약 {Number(detail.distanceKm).toFixed(1)}km</span>
            <span>도착 권역: {detail.dropoffRegion}</span>
          </div>
          <p className="mt-1.5 text-gray-500">
            개인정보 보호를 위해 수락 전에는 시·구 단위 대략 영역만 표시됩니다. 정확한 상·하차
            주소와 담당자 연락처는 배차 완료 후 내 운송 화면에서 확인할 수 있습니다.
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-2xl font-bold text-blue-600">
            {Number(detail.fare).toLocaleString()}원
          </p>
          {detail.recommendedFare > 0 && (
            <p className="text-xs text-gray-500">
              추천 운임 {Number(detail.recommendedFare).toLocaleString()}원
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-gray-900">내 차량 확인</h2>
          {!myVehicle?.vehicleType && (
            <Link
              to="/driver/vehicle"
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              차량 등록하러 가기 →
            </Link>
          )}
        </div>
        {!myVehicle?.vehicleType ? (
          <p className="mt-2 text-xs text-amber-700">
            등록된 차량이 없습니다. 의뢰를 수락하려면 먼저 내 차량을 등록해 주세요.
          </p>
        ) : (
          <div className="mt-2 space-y-2 text-sm">
            <p className="text-gray-700">
              보유 차량:{' '}
              <span className="font-semibold text-gray-900">
                {VEHICLE_LABELS[myVehicle.vehicleType] ?? myVehicle.vehicleType}
                {myVehicle.bodyType
                  ? ` · ${BODY_LABELS[myVehicle.bodyType] ?? myVehicle.bodyType}`
                  : ''}
                {myMaxLoadKg ? ` (최대 ${Number(myMaxLoadKg).toLocaleString()}kg)` : ''}
              </span>
            </p>
            {mismatchWarnings.length > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                {mismatchWarnings.map((warning) => (
                  <p key={warning}>• {warning}</p>
                ))}
                <p className="mt-1 font-medium">
                  수락 시 확인창에서 동의하면 배차받을 수 있습니다.
                </p>
              </div>
            ) : (
              <p className="text-xs font-medium text-green-700">
                요구 차종 및 적재 중량 조건과 일치합니다.
              </p>
            )}
          </div>
        )}
      </div>

      <dl className="rounded-xl border border-gray-200 bg-white px-4 py-2">
        <InfoRow label="상차 희망" value={formatDateTime(detail.pickupAt)} />
        <InfoRow label="도착 희망" value={formatDateTime(detail.arriveBy)} />
        <InfoRow label="거리" value={`${Number(detail.distanceKm).toFixed(1)}km`} />
        <InfoRow
          label="요구 차량"
          value={`${VEHICLE_LABELS[detail.requiredVehicleType] ?? detail.requiredVehicleType}${
            detail.bodyType ? ` · ${BODY_LABELS[detail.bodyType] ?? detail.bodyType}` : ''
          }`}
        />
        <InfoRow
          label="상하차 방식"
          value={LOADING_LABELS[detail.loadingMethod] ?? detail.loadingMethod}
        />
        {detail.memo && <InfoRow label="요청 메모" value={detail.memo} />}
      </dl>

      <dl className="rounded-xl border border-gray-200 bg-white px-4 py-2">
        <InfoRow label="화물" value={detail.itemName} />
        {detail.cargoType && (
          <InfoRow
            label="화물 종류"
            value={CARGO_TYPE_LABELS[detail.cargoType] ?? detail.cargoType}
          />
        )}
        <InfoRow label="중량" value={`${Number(detail.weightKg).toLocaleString()}kg`} />
        <InfoRow
          label="수량"
          value={`${detail.quantity}${PACKAGE_UNIT_LABELS[detail.packageUnit] ?? detail.packageUnit}`}
        />
        {hasSize && (
          <InfoRow
            label="크기(가로×세로×높이)"
            value={`${detail.widthCm}×${detail.depthCm}×${detail.heightCm}cm`}
          />
        )}
        <InfoRow
          label="취급 주의"
          value={
            [detail.fragile && '파손주의', detail.noStack && '적재 금지']
              .filter(Boolean)
              .join(', ') || '없음'
          }
        />
      </dl>

      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => requestAccept(detail, myVehicle)}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {isSubmitting ? '수락 처리 중...' : '의뢰 수락'}
      </button>

      {mismatchModal && (
        <MismatchConfirmModal
          messages={mismatchModal.messages}
          isSubmitting={isSubmitting}
          onCancel={closeMismatchModal}
          onConfirm={() => executeAccept(mismatchModal.order, true)}
        />
      )}
    </section>
  );
}

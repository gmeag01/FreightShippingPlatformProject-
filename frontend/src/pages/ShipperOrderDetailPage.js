import { OrderDeliveryActions, OrderPaymentPanel } from '../components/orders/OrderDeliveryPayment';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchOrderDetail, fetchAdminOrderDetail } from '../api/orders';
import OrderCancel from '../components/orders/OrderCancel';
import { DetailField, OrderLoadError, OrderStatusBadge } from '../components/orders/OrderDisplay';
import {
  BODY_LABELS,
  CARGO_LABELS,
  formatDateTime,
  formatNumber,
  LOADING_LABELS,
  PACKAGE_LABELS,
  statusLabel,
  VEHICLE_LABELS,
} from '../order/presentation';

// 한 장소의 주소와 현장 담당자 정보를 보여 준다.
function LocationCard({ title, location, time, timeLabel }) {
  return (
    <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="font-bold text-gray-900">{title}</h2>
      <p className="mt-3 font-medium break-words text-gray-900">
        {location?.address ?? '주소 미등록'}
      </p>
      {location?.detailAddress && (
        <p className="mt-1 text-sm break-words text-gray-600">{location.detailAddress}</p>
      )}
      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DetailField label={timeLabel}>{formatDateTime(time)}</DetailField>
        <DetailField label="현장 담당자">
          {location?.contactName ?? '미등록'}
          {location?.contactPhone && (
            <a
              className="mt-1 block break-all text-blue-700 underline underline-offset-2"
              href={`tel:${location.contactPhone}`}
            >
              {location.contactPhone}
            </a>
          )}
        </DetailField>
      </dl>
    </section>
  );
}

// 서버가 기록한 시간순 이력을 표시한다. 메모는 줄바꿈을 유지한다.
function OrderHistory({ history }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="font-bold text-gray-900">상태 변경 이력</h2>
      {history.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">아직 기록된 이력이 없습니다.</p>
      ) : (
        <ol className="mt-4 divide-y divide-gray-100">
          {history.map((entry, index) => (
            <li key={`${entry.createdAt}-${index}`} className="py-4 first:pt-0 last:pb-0">
              <p className="text-sm font-semibold text-gray-900">
                {entry.fromStatus ? `${statusLabel(entry.fromStatus)} → ` : ''}
                {statusLabel(entry.toStatus)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {formatDateTime(entry.createdAt)} · {entry.actorName ?? '시스템'}
              </p>
              {entry.memo && (
                <p className="mt-2 text-sm break-words whitespace-pre-wrap text-gray-700">
                  {entry.memo}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// 본인 오더의 운송 정보, 배정 기사와 상태 이력을 조회한다.
export default function ShipperOrderDetailPage({ admin = false }) {
  const { id } = useParams();
  const validId = /^[1-9]\d*$/.test(id ?? '') && Number.isSafeInteger(Number(id));
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${id}:${attempt}`;
  const [result, setResult] = useState(null);
  const loading = validId && result?.key !== requestKey;

  useEffect(() => {
    if (!validId) return;
    const controller = new AbortController();
    (admin ? fetchAdminOrderDetail : fetchOrderDetail)(id, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, error });
      });
    return () => controller.abort();
  }, [id, validId, requestKey, admin]);

  const order = loading ? null : result?.data;
  const error = result?.error;
  return (
    <section className="space-y-5">
      <Link
        to={admin ? '/admin/orders' : '/shipper/orders'}
        className="inline-block text-sm font-medium text-blue-700 hover:underline"
      >
        ← {admin ? '전체 오더 목록' : '내 오더 목록'}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">오더 상세{validId ? ` #${id}` : ''}</h1>
        {validId && (
          <button
            type="button"
            disabled={loading}
            onClick={() => setAttempt((value) => value + 1)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            새로고침
          </button>
        )}
      </div>
      {!validId ? (
        <p role="alert" className="rounded-xl border border-gray-200 p-5 text-sm">
          올바르지 않은 오더 주소입니다. 목록에서 오더를 선택해 주세요.
        </p>
      ) : loading ? (
        <p role="status" className="py-12 text-center text-sm text-gray-500">
          오더 상세를 불러오는 중입니다…
        </p>
      ) : error ? (
        <OrderLoadError
          message={
            error.status === 403
              ? admin
                ? '관리자 조회 권한이 없습니다.'
                : '이 오더를 조회할 권한이 없습니다. 본인이 등록한 오더를 선택해 주세요.'
              : error.status === 404
                ? '오더를 찾을 수 없습니다. 목록에서 다시 확인해 주세요.'
                : error.message
          }
          onRetry={() => setAttempt((value) => value + 1)}
        />
      ) : (
        order && (
          <>
            {!admin && order.status === 'REGISTERED' && (
              <Link
                to={`/shipper/orders/${order.id}/edit`}
                className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                오더 수정
              </Link>
            )}
            <OrderCancel
              key={`${order.id}:${order.version}`}
              order={order}
              admin={admin}
              onSuccess={(data) => setResult({ key: requestKey, data })}
              onReload={() => setAttempt((value) => value + 1)}
            />
            {!admin && (
              <OrderDeliveryActions
                key={`${order.id}:${order.status}`}
                order={order}
                onReload={() => setAttempt((value) => value + 1)}
              />
            )}
            <OrderDetail order={order} />
            <OrderPaymentPanel key={requestKey} orderId={order.id} />
          </>
        )
      )}
    </section>
  );
}

// 상세 응답에 포함된 정보만 표시하고 결제 상태를 운송 상태로 추정하지 않는다.
function OrderDetail({ order }) {
  const cargo = order.cargo ?? {};
  const history = order.history ?? [];
  const cancellation = order.isDriverCancelled ? history.at(-1) : null;
  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
        <div className="flex flex-wrap gap-2">
          <OrderStatusBadge status={order.status} />
          {order.isUnassigned && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
              미배차
            </span>
          )}
        </div>
        <p className="mt-3 text-lg font-bold break-words text-gray-900">
          {order.pickup?.region} → {order.dropoff?.region}
        </p>
        {order.isUnassigned && (
          <p className="mt-2 text-sm text-red-700">
            상차 희망 시각이 지났지만 아직 배차되지 않았습니다.
          </p>
        )}
      </div>
      {cancellation && (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="font-semibold text-amber-900">차주가 배차를 취소했습니다.</p>
          <p className="mt-2 text-sm break-words whitespace-pre-wrap text-amber-900">
            취소 사유: {cancellation.memo || '기록된 사유가 없습니다.'}
          </p>
          <p className="mt-2 text-xs text-amber-800">다른 차주의 수락을 기다리고 있습니다.</p>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <LocationCard
          title="상차지"
          location={order.pickup}
          time={order.pickupAt}
          timeLabel="상차 희망 시각"
        />
        <LocationCard
          title="하차지"
          location={order.dropoff}
          time={order.arriveBy}
          timeLabel="도착 희망 시각"
        />
      </div>
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-bold text-gray-900">화물 및 차량 조건</h2>
        <dl className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-3">
          <DetailField label="품명">{cargo.itemName}</DetailField>
          <DetailField label="화물 종류">
            {CARGO_LABELS[cargo.cargoType] ?? cargo.cargoType}
          </DetailField>
          <DetailField label="중량">{formatNumber(cargo.weightKg)}kg</DetailField>
          <DetailField label="수량">
            {formatNumber(cargo.quantity)} {PACKAGE_LABELS[cargo.packageUnit] ?? cargo.packageUnit}
          </DetailField>
          <DetailField label="요구 차량">
            {VEHICLE_LABELS[order.requiredVehicleType] ?? order.requiredVehicleType} ·{' '}
            {BODY_LABELS[order.bodyType] ?? order.bodyType ?? '차체 무관'}
          </DetailField>
          <DetailField label="상하차 방법">
            {LOADING_LABELS[order.loadingMethod] ?? order.loadingMethod}
          </DetailField>
          <DetailField label="크기 (너비 × 깊이 × 높이)">
            {[cargo.widthCm, cargo.depthCm, cargo.heightCm].map(formatNumber).join(' × ')}cm
          </DetailField>
          <DetailField label="취급 조건">
            {[cargo.fragile && '파손 주의', cargo.noStack && '겹쳐 쌓기 금지']
              .filter(Boolean)
              .join(' · ') || '일반 취급'}
          </DetailField>
        </dl>
        {order.memo && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <h3 className="text-xs text-gray-500">요청 사항</h3>
            <p className="mt-2 text-sm break-words whitespace-pre-wrap text-gray-800">
              {order.memo}
            </p>
          </div>
        )}
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-bold text-gray-900">운임 정보</h2>
          <p className="mt-3 text-2xl font-bold text-blue-700">{formatNumber(order.fare)}원</p>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <DetailField label="등록 당시 추천 운임">
              {order.recommendedFare > 0 ? `${formatNumber(order.recommendedFare)}원` : '미제공'}
            </DetailField>
            <DetailField label="운송 거리">
              {order.distanceKm > 0 ? `${formatNumber(order.distanceKm)}km` : '미산정'}
            </DetailField>
          </dl>
        </section>
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-bold text-gray-900">배정 기사</h2>
          <p className="mt-3 text-lg font-semibold text-gray-800">
            {order.driverName ?? (order.driverId ? '배정된 기사' : '배정된 기사가 없습니다.')}
          </p>
          {order.driverPhone && (
            <a
              href={`tel:${order.driverPhone}`}
              className="mt-2 block text-sm text-blue-700 underline"
            >
              {order.driverPhone}
            </a>
          )}
          {order.driverId && (
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <DetailField label="기사 차량">
                {VEHICLE_LABELS[order.driverVehicleType] ?? '미등록'} ·{' '}
                {BODY_LABELS[order.driverBodyType] ?? '미등록'}
              </DetailField>
              <DetailField label="차량번호">{order.driverPlateNumber ?? '미등록'}</DetailField>
            </dl>
          )}
          {!order.driverId && order.status === 'REGISTERED' && (
            <p className="mt-2 text-sm text-gray-500">차주가 의뢰를 수락하면 이곳에 표시됩니다.</p>
          )}
        </section>
      </div>
      {(order.autoConfirmAt || order.driverCancelableUntil) && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-bold text-gray-900">진행 기한 안내</h2>
          <dl className="mt-3 space-y-3">
            {order.autoConfirmAt && (
              <DetailField label="자동 수령 확인 예정">
                {formatDateTime(order.autoConfirmAt)}
              </DetailField>
            )}
            {order.driverCancelableUntil && (
              <DetailField label="기사 직접 배차 취소 가능 기한">
                {formatDateTime(order.driverCancelableUntil)} 이전까지
              </DetailField>
            )}
          </dl>
        </section>
      )}
      <OrderHistory history={history} />
    </>
  );
}

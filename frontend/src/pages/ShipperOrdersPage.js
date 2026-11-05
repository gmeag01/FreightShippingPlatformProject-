import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchMyOrders } from '../api/orders';
import { DetailField, OrderLoadError, OrderStatusBadge } from '../components/orders/OrderDisplay';
import { formatDateTime, formatNumber, ORDER_STATUS, VEHICLE_LABELS } from '../order/presentation';

// 화주가 자신의 오더를 상태별로 보고 상세 화면으로 이동한다.
export default function ShipperOrdersPage() {
  const [params, setParams] = useSearchParams();
  const requestedStatus = params.get('status') ?? '';
  const status = Object.hasOwn(ORDER_STATUS, requestedStatus) ? requestedStatus : '';
  const rawPage = params.get('page') ?? '0';
  const page =
    /^\d+$/.test(rawPage) && Number.isSafeInteger(Number(rawPage)) && Number(rawPage) < 2147483647
      ? Number(rawPage)
      : 0;
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${status}:${page}:${attempt}`;
  const [result, setResult] = useState(null);
  const loading = result?.key !== requestKey;

  useEffect(() => {
    const controller = new AbortController();
    fetchMyOrders({ status, page, signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, error: error.message });
      });
    return () => controller.abort();
  }, [status, page, requestKey]);

  function changeQuery(nextStatus, nextPage = 0) {
    const next = {};
    if (nextStatus) next.status = nextStatus;
    if (nextPage) next.page = String(nextPage);
    setParams(next);
  }

  const data = loading ? null : result?.data;
  const orders = data?.content ?? [];
  return (
    <section className="space-y-5" aria-labelledby="my-orders-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="my-orders-title" className="text-2xl font-bold text-gray-900">
            내 오더
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            등록한 운송 요청과 현재 진행 상황을 확인하세요.
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => setAttempt((value) => value + 1)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          새로고침
        </button>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="오더 상태 필터">
        {[['', { label: '전체' }], ...Object.entries(ORDER_STATUS)].map(([key, value]) => (
          <button
            key={key}
            type="button"
            aria-pressed={status === key}
            onClick={() => changeQuery(key)}
            className={`rounded-full px-3 py-2 text-sm font-medium ${status === key ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            {value.label}
          </button>
        ))}
      </div>
      {loading ? (
        <p role="status" className="py-12 text-center text-sm text-gray-500">
          오더 목록을 불러오는 중입니다…
        </p>
      ) : result?.error ? (
        <OrderLoadError message={result.error} onRetry={() => setAttempt((value) => value + 1)} />
      ) : (
        <>
          <p className="text-sm text-gray-500" aria-live="polite">
            총 {formatNumber(data?.totalElements ?? 0)}건
          </p>
          {orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-12 text-center">
              <h2 className="font-semibold text-gray-800">
                {page > 0
                  ? '이 페이지에 오더가 없습니다.'
                  : status
                    ? '이 상태의 오더가 없습니다.'
                    : '아직 등록한 오더가 없습니다.'}
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                {page > 0
                  ? '첫 페이지에서 다시 확인해 주세요.'
                  : status
                    ? '다른 상태를 선택해 진행 상황을 확인하세요.'
                    : '운송 요청을 등록하면 이곳에서 진행 상황을 볼 수 있어요.'}
              </p>
              {(status || page > 0) && (
                <button
                  type="button"
                  onClick={() => changeQuery('')}
                  className="mt-4 text-sm font-semibold text-blue-700 underline underline-offset-4"
                >
                  전체 오더 보기
                </button>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    to={`/shipper/orders/${order.id}`}
                    className="block rounded-xl border border-gray-200 bg-white p-5 shadow-xs transition hover:border-blue-300 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-gray-500">오더 #{order.id}</span>
                      <OrderStatusBadge status={order.status} />
                      {order.isUnassigned && (
                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                          미배차
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                      <h2 className="min-w-0 text-lg font-bold break-words text-gray-900">
                        {order.pickupRegion} <span className="text-gray-400">→</span>{' '}
                        {order.dropoffRegion}
                      </h2>
                      <p className="text-lg font-bold text-blue-700">
                        {formatNumber(order.fare)}원
                      </p>
                    </div>
                    <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <DetailField label="상차 희망 시각">
                        {formatDateTime(order.pickupAt)}
                      </DetailField>
                      <DetailField label="화물">
                        {order.itemName} · {formatNumber(order.weightKg)}kg
                      </DetailField>
                      <DetailField label="요구 차량">
                        {VEHICLE_LABELS[order.requiredVehicleType] ?? order.requiredVehicleType}
                      </DetailField>
                    </dl>
                    {order.isUnassigned && (
                      <p className="mt-3 text-xs text-red-700">
                        상차 희망 시각이 지났지만 아직 배차되지 않았습니다.
                      </p>
                    )}
                    <p className="mt-4 text-right text-sm font-semibold text-blue-700">
                      상세 보기 →
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {(data?.totalPages > 1 || page > 0) && (
            <nav
              aria-label="오더 목록 페이지"
              className="flex items-center justify-center gap-3 pt-2"
            >
              <button
                type="button"
                disabled={page === 0}
                onClick={() => changeQuery(status, page - 1)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-40"
              >
                이전
              </button>
              <span className="text-sm text-gray-600">
                {page + 1} / {Math.max(data?.totalPages ?? 0, page + 1)}
              </span>
              <button
                type="button"
                disabled={page + 1 >= (data?.totalPages ?? 0)}
                onClick={() => changeQuery(status, page + 1)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-40"
              >
                다음
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

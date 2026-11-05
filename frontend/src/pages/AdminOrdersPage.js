import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchAdminOrders } from '../api/orders';
import { OrderLoadError, OrderStatusBadge } from '../components/orders/OrderDisplay';
import { ORDER_STATUS, VEHICLE_LABELS, formatDateTime, formatNumber } from '../order/presentation';

// 관리자 전용 전체 오더 검색. 검색 조건과 페이지를 URL에 보존한다.
export default function AdminOrdersPage() {
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const [attempt, setAttempt] = useState(0);
  const key = `${query}:${attempt}`;
  const [result, setResult] = useState(null);
  const [inputError, setInputError] = useState('');
  const loading = result?.key !== key;
  const rawPage = params.get('page') ?? '0';
  const page = /^\d+$/.test(rawPage) && Number(rawPage) < 2147483647 ? Number(rawPage) : 0;

  useEffect(() => {
    const controller = new AbortController();
    const filters = Object.fromEntries(new URLSearchParams(query));
    filters.page = page;
    fetchAdminOrders(filters, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ key, error: error.message });
      });
    return () => controller.abort();
  }, [query, page, key]);

  function search(event) {
    event.preventDefault();
    const filters = Object.fromEntries(
      [...new FormData(event.currentTarget)].filter(([, value]) => value),
    );
    if (filters.from && filters.to && filters.from > filters.to) {
      setInputError('종료일은 시작일 이후로 선택해 주세요.');
      return;
    }
    setInputError('');
    setParams(filters);
  }
  function changePage(next) {
    const nextParams = new URLSearchParams(params);
    nextParams.set('page', String(next));
    setParams(nextParams);
  }
  const data = loading ? null : result?.data;
  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-bold">오더 관리</h1>
      <p className="text-sm text-gray-500">
        전체 화주의 오더를 조회합니다. 기간은 상차 희망일 기준입니다.
      </p>
      <form
        key={query}
        onSubmit={search}
        className="grid gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {[
          ['status', '상태', ORDER_STATUS],
          ['vehicleType', '차종', VEHICLE_LABELS],
        ].map(([name, label, options]) => (
          <label key={name} htmlFor={`admin-${name}`} className="min-w-0 text-sm font-medium">
            {label}
            <select
              id={`admin-${name}`}
              aria-label={label}
              name={name}
              defaultValue={params.get(name) ?? ''}
              className="mt-1 w-full rounded-lg border border-gray-300 p-2"
            >
              <option value="">전체</option>
              {Object.entries(options).map(([value, item]) => (
                <option key={value} value={value}>
                  {item.label ?? item}
                </option>
              ))}
            </select>
          </label>
        ))}
        {[
          ['from', '상차 시작일'],
          ['to', '상차 종료일'],
        ].map(([name, label]) => (
          <label key={name} htmlFor={`admin-${name}`} className="min-w-0 text-sm font-medium">
            {label}
            <input
              type="date"
              id={`admin-${name}`}
              aria-label={label}
              name={name}
              defaultValue={params.get(name) ?? ''}
              className="mt-1 w-full min-w-0 rounded-lg border border-gray-300 p-2"
            />
          </label>
        ))}
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            검색
          </button>
          <button
            type="button"
            onClick={() => {
              setInputError('');
              setParams({});
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
          >
            조건 초기화
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => setAttempt((value) => value + 1)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-50"
          >
            새로고침
          </button>
        </div>
      </form>
      {inputError && (
        <p role="alert" className="text-sm text-red-700">
          {inputError}
        </p>
      )}
      {loading ? (
        <p role="status" className="py-8 text-center text-sm text-gray-500">
          오더를 불러오는 중입니다…
        </p>
      ) : result?.error ? (
        <OrderLoadError message={result.error} onRetry={() => setAttempt((value) => value + 1)} />
      ) : (
        <>
          <p className="text-sm text-gray-500">
            검색 결과 {formatNumber(data?.totalElements ?? 0)}건
          </p>
          {!data?.content?.length ? (
            <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
              조건에 해당하는 오더가 없습니다.
            </p>
          ) : (
            <ul className="space-y-3">
              {data.content.map((order) => (
                <li key={order.id}>
                  <Link
                    to={`/admin/orders/${order.id}`}
                    className="block rounded-xl border border-gray-200 bg-white p-5 hover:border-blue-300"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-gray-500">#{order.id}</span>
                      <OrderStatusBadge status={order.status} />
                      {order.isUnassigned && (
                        <span className="text-xs font-semibold text-red-700">미배차</span>
                      )}
                    </div>
                    <p className="mt-3 font-bold break-words">
                      {order.pickupRegion} → {order.dropoffRegion}
                    </p>
                    <p className="mt-2 text-sm text-gray-600">
                      {order.itemName} · {VEHICLE_LABELS[order.requiredVehicleType]} ·{' '}
                      {formatNumber(order.fare)}원
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      상차 {formatDateTime(order.pickupAt)}
                    </p>
                    <p className="mt-3 text-sm font-semibold text-blue-700">상세·취소 관리 →</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {(data?.totalPages > 1 || page > 0) && (
            <nav aria-label="관리자 오더 페이지" className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => changePage(page - 1)}
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
              >
                이전
              </button>
              <span className="text-sm">
                {page + 1} / {Math.max(data?.totalPages ?? 0, page + 1)}
              </span>
              <button
                type="button"
                disabled={page + 1 >= (data?.totalPages ?? 0)}
                onClick={() => changePage(page + 1)}
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
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

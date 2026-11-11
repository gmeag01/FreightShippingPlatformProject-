import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAdminDashboard } from '../api/dashboard';
import { VEHICLE_LABELS } from '../order/presentation';

// 날짜와 시각을 MM.dd HH:mm 형식으로 변환한다.
function formatShortDateTime(value) {
  if (!value) return '-';
  const zonedValue = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}+09:00`;
  const date = new Date(zonedValue);
  if (Number.isNaN(date.getTime())) return '-';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}.${day} ${hours}:${minutes}`;
}

// 오늘과 어제의 건수 차이를 설명 문구로 변환한다.
function renderDiffText(today, yesterday) {
  const diff = today - yesterday;
  if (diff > 0) return `어제보다 ${diff}건 많음`;
  if (diff < 0) return `어제보다 ${Math.abs(diff)}건 적음`;
  return '어제와 같음';
}

/**
 * 관리자 대시보드 화면.
 * 오늘의 운송 현황(등록·배차·완료 건수 및 어제 대비 증감),
 * 미배차/분쟁 건수, 상차 임박 미배차 및 처리 대기 분쟁 목록을 보여준다.
 */
export default function AdminDashboardPage() {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const loading = result?.attempt !== attempt;

  const reload = () => setAttempt((prev) => prev + 1);

  useEffect(() => {
    const controller = new AbortController();

    fetchAdminDashboard({ signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted) {
          // client.js가 ApiResponse를 벗겨 data만 돌려주므로 res가 곧 대시보드 응답이다.
          setResult({ attempt, data: res, fetchedAt: new Date() });
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          const message =
            err.response?.data?.message || err.message || '대시보드 데이터를 불러오지 못했습니다.';
          setResult({ attempt, error: message });
        }
      });

    return () => controller.abort();
  }, [attempt]);

  const data = result?.data;
  const error = result?.error;
  const lastFetchedAt = result?.fetchedAt;
  const metrics = data?.summary;
  const urgentOrders = data?.urgentOrders || [];
  const disputeOrders = data?.disputeOrders || [];

  return (
    <div className="space-y-6">
      {/* 헤더 및 기준 시각 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h1 text-ink font-bold">대시보드</h1>
          <p className="text-muted mt-1 text-sm">
            {lastFetchedAt ? `${formatShortDateTime(lastFetchedAt)} 기준` : '운송 현황 집계 중'}
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="border-line-strong text-copy inline-flex min-h-10 items-center justify-center rounded-md border bg-white px-4 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? '새로고침 중...' : '새로고침'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-danger-soft text-danger rounded-lg border border-red-200 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* 상단 4개 지표 카드 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 오늘 등록 */}
        <div className="border-line bg-card rounded-lg border p-5">
          <div className="text-caption text-subtle font-medium">오늘 등록</div>
          <div className="text-ink mt-2 text-3xl font-bold tabular-nums">
            {loading && !data ? '-' : `${metrics?.todayRegistered ?? 0}건`}
          </div>
          <div className="text-caption text-muted mt-2">
            {metrics ? renderDiffText(metrics.todayRegistered, metrics.yesterdayRegistered) : '-'}
          </div>
        </div>

        {/* 오늘 배차 */}
        <div className="border-line bg-card rounded-lg border p-5">
          <div className="text-caption text-subtle font-medium">오늘 배차</div>
          <div className="text-ink mt-2 text-3xl font-bold tabular-nums">
            {loading && !data ? '-' : `${metrics?.todayAssigned ?? 0}건`}
          </div>
          <div className="text-caption text-muted mt-2">
            {metrics ? renderDiffText(metrics.todayAssigned, metrics.yesterdayAssigned) : '-'}
          </div>
        </div>

        {/* 오늘 완료 */}
        <div className="border-line bg-card rounded-lg border p-5">
          <div className="text-caption text-subtle font-medium">오늘 완료</div>
          <div className="text-ink mt-2 text-3xl font-bold tabular-nums">
            {loading && !data ? '-' : `${metrics?.todayCompleted ?? 0}건`}
          </div>
          <div className="text-caption text-muted mt-2">
            {metrics ? renderDiffText(metrics.todayCompleted, metrics.yesterdayCompleted) : '-'}
          </div>
        </div>

        {/* 미배차 */}
        <div className="border-line bg-card rounded-lg border p-5">
          <div className="text-caption text-subtle font-medium">미배차</div>
          <div className="text-signal mt-2 text-3xl font-bold tabular-nums">
            {loading && !data ? '-' : `${metrics?.unassignedCount ?? 0}건`}
          </div>
          <div className="text-caption text-muted mt-2">등록됨 상태로 남은 오더</div>
        </div>
      </div>

      {/* 하단 2분할 섹션: 처리할 분쟁 & 상차일이 가까운 미배차 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* 처리할 분쟁 */}
        <div className="border-line bg-card rounded-lg border p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-h2 text-ink font-bold">
              처리할 분쟁 {metrics?.disputedCount != null ? `${metrics.disputedCount}건` : ''}
            </h2>
            <Link
              to="/admin/disputes"
              className="text-primary text-sm font-semibold hover:underline"
            >
              전체 보기
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {disputeOrders.length === 0 ? (
              <div className="text-muted py-12 text-center text-sm">
                {loading ? '불러오는 중...' : '처리 대기 중인 분쟁이 없습니다.'}
              </div>
            ) : (
              disputeOrders.map((order) => (
                <div key={order.orderId} className="rounded-sm py-3.5 hover:bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-caption text-muted font-mono">#{order.orderId}</span>
                      <span className="bg-status-disputed text-caption text-status-disputed-ink inline-flex min-h-6 items-center rounded-sm px-2.5 font-semibold">
                        분쟁
                      </span>
                    </div>
                    <span className="text-caption text-subtle tabular-nums">
                      {formatShortDateTime(order.reportedAt)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <p className="text-body text-copy truncate font-medium">
                      {order.pickupRegion} → {order.dropoffRegion}
                      {order.reason ? ` · ${order.reason}` : ''}
                    </p>
                    <Link
                      to="/admin/disputes"
                      className="text-caption text-primary ml-2 whitespace-nowrap hover:underline"
                    >
                      상세
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 상차일이 가까운 미배차 */}
        <div className="border-line bg-card rounded-lg border p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-h2 text-ink font-bold">상차일이 가까운 미배차</h2>
            <Link to="/admin/orders" className="text-primary text-sm font-semibold hover:underline">
              전체 보기
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {urgentOrders.length === 0 ? (
              <div className="text-muted py-12 text-center text-sm">
                {loading ? '불러오는 중...' : '미배차 오더가 없습니다.'}
              </div>
            ) : (
              urgentOrders.map((order) => (
                <div key={order.orderId} className="rounded-sm py-3.5 hover:bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-caption text-muted font-mono">#{order.orderId}</span>
                      {/* 시안 기준: 상차 희망 시각이 지난 오더만 '미배차', 아직이면 '등록됨'. */}
                      {order.isUnassigned ? (
                        <span className="bg-signal-soft text-caption text-signal-ink inline-flex min-h-6 items-center rounded-sm px-2.5 font-semibold">
                          미배차
                        </span>
                      ) : (
                        <span className="bg-status-registered text-caption text-status-registered-ink inline-flex min-h-6 items-center rounded-sm px-2.5 font-semibold">
                          등록됨
                        </span>
                      )}
                    </div>
                    <span className="text-caption text-subtle tabular-nums">
                      {formatShortDateTime(order.pickupAt)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <p className="text-body text-copy truncate font-medium">
                      {order.pickupRegion} → {order.dropoffRegion}
                      {order.requiredVehicleType
                        ? ` · ${VEHICLE_LABELS[order.requiredVehicleType] || order.requiredVehicleType}`
                        : ''}
                    </p>
                    <Link
                      to={`/admin/orders/${order.orderId}`}
                      className="text-caption text-primary ml-2 whitespace-nowrap hover:underline"
                    >
                      상세
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

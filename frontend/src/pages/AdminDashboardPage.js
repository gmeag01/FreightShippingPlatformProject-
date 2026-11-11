import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAdminDashboard, fetchDashboardOrders } from '../api/dashboard';
import { VEHICLE_LABELS, formatNumber, statusLabel } from '../order/presentation';

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
 * 상단 통계 카드 클릭 시 해당 대상 오더 목록을 모달 팝업으로 상세 조회할 수 있다.
 */
export default function AdminDashboardPage() {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const loading = result?.attempt !== attempt;

  // 통계 카드 클릭 시 띄울 모달 상태
  const [activeModal, setActiveModal] = useState(null); // { type, title }
  const [modalOrders, setModalOrders] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

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

  // 통계 카드 클릭 시 상세 오더 목록 모달 열기
  function openOrdersModal(type, title) {
    setActiveModal({ type, title });
    setModalLoading(true);
    setModalError(null);
    setModalOrders([]);

    fetchDashboardOrders(type)
      .then((res) => {
        setModalOrders(res || []);
      })
      .catch((err) => {
        setModalError(
          err.response?.data?.message || err.message || '오더 목록을 불러오지 못했습니다.',
        );
      })
      .finally(() => {
        setModalLoading(false);
      });
  }

  function closeModal() {
    setActiveModal(null);
    setModalOrders([]);
    setModalError(null);
  }

  // 모달이 열려 있을 때 ESC 키 입력 감지 및 배경 스크롤 방지
  useEffect(() => {
    if (!activeModal) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [activeModal]);

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

      {/* 상단 4개 지표 카드 (클릭 시 상세 모달 오픈) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 오늘 등록 */}
        <button
          type="button"
          onClick={() => openOrdersModal('TODAY_REGISTERED', '오늘 등록된 오더')}
          className="border-line bg-card hover:border-primary group rounded-lg border p-5 text-left transition-all hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-caption text-subtle font-medium">오늘 등록</span>
            <span className="text-caption text-primary font-semibold opacity-0 transition-opacity group-hover:opacity-100">
              목록 보기 →
            </span>
          </div>
          <div className="text-ink mt-2 text-3xl font-bold tabular-nums">
            {loading && !data ? '-' : `${metrics?.todayRegistered ?? 0}건`}
          </div>
          <div className="text-caption text-muted mt-2">
            {metrics ? renderDiffText(metrics.todayRegistered, metrics.yesterdayRegistered) : '-'}
          </div>
        </button>

        {/* 오늘 배차 */}
        <button
          type="button"
          onClick={() => openOrdersModal('TODAY_ASSIGNED', '오늘 배차된 오더')}
          className="border-line bg-card hover:border-primary group rounded-lg border p-5 text-left transition-all hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-caption text-subtle font-medium">오늘 배차</span>
            <span className="text-caption text-primary font-semibold opacity-0 transition-opacity group-hover:opacity-100">
              목록 보기 →
            </span>
          </div>
          <div className="text-ink mt-2 text-3xl font-bold tabular-nums">
            {loading && !data ? '-' : `${metrics?.todayAssigned ?? 0}건`}
          </div>
          <div className="text-caption text-muted mt-2">
            {metrics ? renderDiffText(metrics.todayAssigned, metrics.yesterdayAssigned) : '-'}
          </div>
        </button>

        {/* 오늘 완료 */}
        <button
          type="button"
          onClick={() => openOrdersModal('TODAY_COMPLETED', '오늘 완료된 오더')}
          className="border-line bg-card hover:border-primary group rounded-lg border p-5 text-left transition-all hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-caption text-subtle font-medium">오늘 완료</span>
            <span className="text-caption text-primary font-semibold opacity-0 transition-opacity group-hover:opacity-100">
              목록 보기 →
            </span>
          </div>
          <div className="text-ink mt-2 text-3xl font-bold tabular-nums">
            {loading && !data ? '-' : `${metrics?.todayCompleted ?? 0}건`}
          </div>
          <div className="text-caption text-muted mt-2">
            {metrics ? renderDiffText(metrics.todayCompleted, metrics.yesterdayCompleted) : '-'}
          </div>
        </button>

        {/* 미배차: 상차 희망 시각이 지난 등록됨 오더. 누르면 모달 또는 오더 관리 이동 */}
        <button
          type="button"
          onClick={() => openOrdersModal('URGENT_UNASSIGNED', '상차 시각 지난 미배차 오더')}
          className="border-line bg-card hover:border-signal group rounded-lg border p-5 text-left transition-all hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-caption text-subtle font-medium">미배차</span>
            <span className="text-caption text-signal font-semibold opacity-0 transition-opacity group-hover:opacity-100">
              목록 보기 →
            </span>
          </div>
          <div className="text-signal mt-2 text-3xl font-bold tabular-nums">
            {loading && !data ? '-' : `${metrics?.unassignedCount ?? 0}건`}
          </div>
          <div className="text-caption text-muted mt-2">상차 희망 시각이 지난 등록됨 오더</div>
        </button>
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

      {/* 통계 카드 클릭 시 열리는 오더 목록 모달 */}
      {activeModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="border-line bg-card flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border shadow-2xl"
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-h2 text-ink font-bold">{activeModal.title}</h3>
                <p className="text-caption text-muted mt-0.5">
                  총 <strong className="text-ink">{modalOrders.length}건</strong>의 오더가
                  조회되었습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-muted hover:text-ink rounded-md p-1.5 text-2xl leading-none font-semibold hover:bg-slate-100"
                aria-label="닫기"
              >
                &times;
              </button>
            </div>

            {/* 모달 내용 (스크롤 목록) */}
            <div className="flex-1 space-y-3 overflow-y-auto p-6">
              {modalLoading ? (
                <div className="text-muted py-16 text-center text-sm">
                  오더 목록을 불러오는 중...
                </div>
              ) : modalError ? (
                <div className="bg-danger-soft text-danger rounded-lg border border-red-200 p-4 text-center text-sm">
                  {modalError}
                </div>
              ) : modalOrders.length === 0 ? (
                <div className="text-muted py-16 text-center text-sm">
                  해당 조건에 해당하는 오더가 없습니다.
                </div>
              ) : (
                modalOrders.map((order) => (
                  <div
                    key={order.orderId}
                    className="border-line hover:border-primary/50 rounded-lg border bg-white p-4 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-caption text-muted font-mono">#{order.orderId}</span>
                        <span className="text-caption inline-flex min-h-6 items-center rounded-sm bg-blue-50 px-2 font-semibold text-blue-700">
                          {statusLabel(order.status)}
                        </span>
                        {order.actionAt && (
                          <span className="text-caption text-subtle tabular-nums">
                            {formatShortDateTime(order.actionAt)}
                          </span>
                        )}
                      </div>
                      <Link
                        to={`/admin/orders/${order.orderId}`}
                        className="border-line-strong text-copy text-caption inline-flex items-center justify-center rounded-md border bg-white px-2.5 py-1 font-semibold hover:bg-slate-50"
                      >
                        상세보기 →
                      </Link>
                    </div>

                    <div className="text-body text-ink mt-2.5 font-bold">
                      {order.pickupRegion} → {order.dropoffRegion}
                      <span className="text-muted ml-2 font-normal">
                        · {order.itemName || '화물'}
                      </span>
                    </div>

                    <div className="text-caption text-muted mt-2 flex flex-wrap items-center justify-between gap-y-1">
                      <div>
                        <span>
                          화주: <strong className="text-copy">{order.shipperName}</strong>
                        </span>
                        {order.driverName && order.driverName !== '-' && (
                          <span className="ml-3">
                            차주: <strong className="text-copy">{order.driverName}</strong>
                          </span>
                        )}
                        {order.requiredVehicleType && (
                          <span className="ml-3">
                            {VEHICLE_LABELS[order.requiredVehicleType] || order.requiredVehicleType}
                          </span>
                        )}
                      </div>
                      <div className="text-ink font-bold tabular-nums">
                        {formatNumber(order.fare)}원
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-6 py-3.5">
              <button
                type="button"
                onClick={closeModal}
                className="border-line-strong text-copy inline-flex min-h-10 items-center justify-center rounded-md border bg-white px-5 text-sm font-semibold hover:bg-slate-100"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

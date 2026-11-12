import { useEffect, useState } from 'react';
import { fetchDispute, fetchDisputeCounts, fetchDisputes } from '../api/disputes';
import DisputeResolution from '../components/disputes/DisputeResolution';
import { DetailField, OrderLoadError, OrderStatusBadge } from '../components/orders/OrderDisplay';
import { formatDateTime, formatNumber, statusLabel, VEHICLE_LABELS } from '../order/presentation';

const card = 'min-w-0 rounded-lg border border-line bg-card p-4 sm:p-5';
const pageButton = 'min-h-11 rounded-md border border-line-strong px-4 text-sm disabled:opacity-50';
const PAYMENT_STATUS = {
  HELD: '운임 보관 중',
  RELEASED: '기사 지급 완료',
  REFUNDED: '화주 환불 완료',
};

// 관리자 메뉴에서 처리 대기 목록과 처리 완료 이력, 선택한 분쟁 상세를 함께 본다.
export default function AdminDisputesPage() {
  const [tab, setTab] = useState('PENDING'); // 'PENDING' | 'RESOLVED'
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const [list, setList] = useState(null);
  const [counts, setCounts] = useState({ pending: 0, resolved: 0 });
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');

  const resolved = tab === 'RESOLVED';
  const listKey = `${tab}:${page}:${revision}`;

  // 분쟁 건수 통계(대기/완료) 조회
  useEffect(() => {
    const controller = new AbortController();
    fetchDisputeCounts({ signal: controller.signal })
      .then(setCounts)
      .catch(() => {});
    return () => controller.abort();
  }, [revision]);

  // 분쟁 목록 페이징 조회
  useEffect(() => {
    const controller = new AbortController();
    fetchDisputes(page, { resolved, signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (page > 0 && !data.content.length) {
          setPage(Math.max(0, data.totalPages - 1));
          return;
        }
        setList({ key: listKey, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setList({ key: listKey, error });
      });
    return () => controller.abort();
  }, [resolved, page, listKey]);

  const current = list?.key === listKey ? list : null;
  const rows = current?.data?.content ?? [];
  const orderId = selected ?? rows[0]?.orderId;

  function refresh(message = '') {
    setNotice(message);
    setRevision((value) => value + 1);
  }

  function handleSelectTab(nextTab) {
    if (tab === nextTab) return;
    setTab(nextTab);
    setPage(0);
    setSelected(null);
    setNotice('');
  }

  function changePage(nextPage) {
    setPage(nextPage);
    setSelected(null);
    setNotice('');
  }

  return (
    <div className="text-copy space-y-4 break-keep">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-h1-sm text-ink sm:text-h1 font-bold">분쟁 처리</h1>
        <p className="text-muted text-sm tabular-nums">
          {tab === 'PENDING' ? `처리 대기 ${counts.pending}건` : `처리 완료 ${counts.resolved}건`}
        </p>
      </header>

      {/* 처리 대기 / 처리 완료 탭 바 */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => handleSelectTab('PENDING')}
          className={`min-h-11 rounded-md border px-4 font-semibold transition-colors ${
            tab === 'PENDING'
              ? 'border-ink bg-ink text-white'
              : 'border-line-strong text-copy bg-white hover:bg-slate-50'
          }`}
        >
          처리 대기 {counts.pending}
        </button>
        <button
          type="button"
          onClick={() => handleSelectTab('RESOLVED')}
          className={`min-h-11 rounded-md border px-4 font-semibold transition-colors ${
            tab === 'RESOLVED'
              ? 'border-ink bg-ink text-white'
              : 'border-line-strong text-copy bg-white hover:bg-slate-50'
          }`}
        >
          처리 완료 {counts.resolved}
        </button>
      </div>

      {notice && (
        <p role="status" className="border-line bg-primary-soft rounded-lg border p-4 text-sm">
          {notice}
        </p>
      )}

      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <section aria-label="분쟁 목록" className="min-w-0 space-y-2">
          {!current && (
            <p role="status" className={card}>
              분쟁 목록을 불러오는 중입니다…
            </p>
          )}
          {current?.error && (
            <OrderLoadError message={current.error.message} onRetry={() => refresh()} />
          )}
          {current?.data && !rows.length && (
            <p className={card}>
              {tab === 'PENDING'
                ? '처리 대기 중인 분쟁이 없습니다.'
                : '처리 완료된 분쟁 이력이 없습니다.'}
            </p>
          )}
          {rows.map((row) => (
            <button
              key={row.orderId}
              type="button"
              aria-pressed={orderId === row.orderId}
              onClick={() => {
                setSelected(row.orderId);
                setNotice('');
              }}
              className={`bg-card hover:border-primary block w-full rounded-lg border p-3 text-left ${orderId === row.orderId ? 'border-ink' : 'border-line'}`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm">#{row.orderId}</span>
                <OrderStatusBadge status={row.status || 'DISPUTED'} />
              </span>
              <span className="text-ink mt-1 block text-sm font-semibold wrap-anywhere">
                {row.pickupRegion} → {row.dropoffRegion}
              </span>
              <span className="text-muted mt-1 block text-xs">
                {formatDateTime(row.reportedAt)}
              </span>
              <span className="text-muted mt-1 block truncate text-xs">{row.reason}</span>
            </button>
          ))}
          {current?.data?.totalPages > 1 && (
            <nav aria-label="분쟁 목록 페이지" className="flex items-center justify-between gap-2">
              <button
                type="button"
                className={pageButton}
                disabled={page === 0}
                onClick={() => changePage(page - 1)}
              >
                이전
              </button>
              <span className="text-sm tabular-nums">
                {page + 1} / {current.data.totalPages}
              </span>
              <button
                type="button"
                className={pageButton}
                disabled={current.data.last}
                onClick={() => changePage(page + 1)}
              >
                다음
              </button>
            </nav>
          )}
        </section>
        {orderId != null && (
          <DisputeDetail
            key={`${orderId}:${revision}`}
            orderId={orderId}
            onRetry={() => refresh()}
            onRefresh={(message) => {
              setSelected(orderId);
              refresh(message);
            }}
          />
        )}
      </div>
    </div>
  );
}

// 선택이 바뀌면 이전 조회를 취소하고 새 분쟁만 표시한다.
function DisputeDetail({ orderId, onRetry, onRefresh }) {
  const [result, setResult] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    fetchDispute(orderId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ error });
      });
    return () => controller.abort();
  }, [orderId]);

  if (!result)
    return (
      <p role="status" className={card}>
        분쟁 상세를 불러오는 중입니다…
      </p>
    );
  if (result.error) return <OrderLoadError message={result.error.message} onRetry={onRetry} />;
  const dispute = result.data;
  return (
    <div className="min-w-0 space-y-4">
      {/* 분쟁 처리 완료 결과 배너 (이미 종결된 분쟁인 경우) */}
      {dispute.status !== 'DISPUTED' && (
        <section className={`${card} border-emerald-200 bg-emerald-50/70 text-emerald-900`}>
          <h3 className="flex items-center gap-1.5 font-bold text-emerald-800">
            <span>✓</span>
            <span>분쟁 처리가 완료된 오더입니다</span>
          </h3>
          <p className="mt-1 text-sm text-emerald-700">
            판결 결과:{' '}
            <strong className="text-emerald-900">
              {dispute.status === 'COMPLETED'
                ? '차주 운임 지급 완료'
                : dispute.status === 'CANCELLED'
                  ? '화주 전액 환불 완료'
                  : statusLabel(dispute.status)}
            </strong>
            {dispute.paymentStatus &&
              ` (${PAYMENT_STATUS[dispute.paymentStatus] || dispute.paymentStatus})`}
          </p>
        </section>
      )}

      <DisputeSummary dispute={dispute} />
      <DisputeHistory history={dispute.history} />

      {dispute.status === 'DISPUTED' && dispute.paymentStatus === 'HELD' && (
        <DisputeResolution dispute={dispute} onRefresh={onRefresh} />
      )}
      {dispute.status === 'DISPUTED' && dispute.paymentStatus !== 'HELD' && (
        <p role="status" className={card}>
          보관 중인 운임이 없어 지급이나 환불을 진행할 수 없습니다.
        </p>
      )}
    </div>
  );
}

// 신고 내용과 결제 금액, 판단에 필요한 운송 정보를 표시한다.
function DisputeSummary({ dispute }) {
  const vehicle = [VEHICLE_LABELS[dispute.vehicleType], dispute.plateNumber]
    .filter(Boolean)
    .join(' · ');
  return (
    <section className={`${card} space-y-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-muted font-mono text-sm">#{dispute.orderId}</span>
          <h2 className="text-h2 text-ink mt-1 font-bold wrap-anywhere">
            {dispute.pickupRegion} → {dispute.dropoffRegion}
          </h2>
        </div>
        <div>
          <p className="text-fare text-ink font-bold tabular-nums">
            {formatNumber(dispute.fare)}원
          </p>
          <p className="text-muted text-sm">
            {PAYMENT_STATUS[dispute.paymentStatus] ?? '결제 내역 없음'}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <OrderStatusBadge status={dispute.status} />
        <span className="text-muted text-sm">신고 {formatDateTime(dispute.reportedAt)}</span>
      </div>
      <div className="bg-danger-soft text-danger rounded-lg p-3 text-sm">
        <h3 className="font-semibold">화주 신고 사유</h3>
        <p className="mt-1 wrap-anywhere whitespace-pre-wrap">{dispute.reason}</p>
      </div>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <DetailField label="화주">
          {dispute.shipperName}
          <span className="text-muted mt-1 block text-sm">
            {dispute.shipperPhone?.trim() || '등록된 연락처 없음'}
          </span>
        </DetailField>
        <DetailField label="차주">
          {dispute.driverName}
          <span className="text-muted mt-1 block text-sm">
            {dispute.driverPhone?.trim() || '등록된 연락처 없음'}
          </span>
        </DetailField>
        <DetailField label="차량">{vehicle || null}</DetailField>
        <DetailField label="화물">
          {dispute.itemName} · {formatNumber(dispute.weightKg)}kg
        </DetailField>
      </dl>
    </section>
  );
}

// 최근 처리 결과와 메모를 위에 표시한다.
function DisputeHistory({ history }) {
  return (
    <section className={card}>
      <h2 className="text-h2 text-ink font-bold">상태 이력</h2>
      <ol className="border-line mt-3 space-y-3 border-l pl-4 text-sm">
        {[...history].reverse().map((entry, index) => (
          <li key={`${entry.createdAt}-${index}`}>
            <p className="text-muted text-xs">
              {formatDateTime(entry.createdAt)} · {entry.actorName ?? '시스템'}
            </p>
            <p className="text-ink mt-1 font-medium">
              {entry.fromStatus ? `${statusLabel(entry.fromStatus)} → ` : ''}
              {statusLabel(entry.toStatus)}
            </p>
            {entry.memo && (
              <p className="text-copy mt-1 wrap-anywhere whitespace-pre-wrap">{entry.memo}</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

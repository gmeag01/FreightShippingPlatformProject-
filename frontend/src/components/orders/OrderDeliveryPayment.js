import { useEffect, useRef, useState } from 'react';
import {
  confirmOrderReceipt,
  fetchOrderPayment,
  reportOrderIssue,
} from '../../api/orderIntegration';
import { formatDateTime, formatNumber } from '../../order/presentation';

const PAYMENT_LABELS = { HELD: '운임 보관 중', RELEASED: '기사 지급 완료', REFUNDED: '환불 완료' };
const TRANSACTION_LABELS = {
  CHARGE: '결제',
  ADDITIONAL_CHARGE: '추가 결제',
  PARTIAL_REFUND: '부분 환불',
  PAYOUT: '기사 지급',
  REFUND: '환불',
};

// E 담당 API의 결제 상태와 거래 내역을 조회한다. 운송 상태로 결제를 추정하지 않는다.
export function OrderPaymentPanel({ orderId }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const key = `${orderId}:${attempt}`;
  useEffect(() => {
    const controller = new AbortController();
    fetchOrderPayment(orderId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ key, error });
      });
    return () => controller.abort();
  }, [orderId, key]);
  const loading = result?.key !== key;
  return (
    <section className="border-line bg-card rounded-xl border p-5">
      <h2 className="text-ink font-bold">결제 내역</h2>
      {loading ? (
        <p role="status" className="text-subtle mt-3 text-sm">
          결제 정보를 불러오는 중입니다…
        </p>
      ) : result.error ? (
        <div className="mt-3 text-sm">
          <p role="status">
            {result.error.code === 'PAYMENT_NOT_FOUND'
              ? '아직 결제 내역이 없습니다.'
              : result.error.message}
          </p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="text-primary-dark mt-2 underline"
          >
            결제 내역 다시 불러오기
          </button>
        </div>
      ) : (
        <>
          <p className="text-ink mt-3 font-semibold">
            {PAYMENT_LABELS[result.data.status] ?? result.data.status} ·{' '}
            {formatNumber(result.data.amount)}원
          </p>
          <ol className="mt-3 divide-y divide-gray-100">
            {result.data.transactions?.map((transaction, index) => (
              <li
                key={`${transaction.createdAt}-${index}`}
                className="flex flex-wrap justify-between gap-2 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {TRANSACTION_LABELS[transaction.type] ?? transaction.type}
                  </p>
                  <p className="text-subtle mt-1 text-xs">
                    {formatDateTime(transaction.createdAt)}
                  </p>
                </div>
                <p>{formatNumber(transaction.amount)}원</p>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

// 화주가 하차 후 수령 확인 또는 문제 신고를 검토하고 요청한다.
export function OrderDeliveryActions({ order, onReload }) {
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  if (order.status !== 'AWAITING_CONFIRM') return null;
  async function execute(event) {
    event.preventDefault();
    if (inFlight.current) return;
    if (action === 'report' && !reason.trim()) {
      setError('문제 신고 사유를 입력해 주세요.');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      if (action === 'confirm') await confirmOrderReceipt(order.id);
      else await reportOrderIssue(order.id, reason.trim());
      onReload();
    } catch (failure) {
      setError(
        failure.status === 409
          ? '이미 처리되었거나 상태가 바뀌었습니다. 최신 정보를 확인해 주세요.'
          : failure.message,
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="border-line bg-primary-soft space-y-3 rounded-xl border p-5">
      <h2 className="text-ink font-bold">운송 수령 확인</h2>
      <p className="text-copy text-sm">화물을 확인한 뒤 수령을 확정하거나 문제를 신고해 주세요.</p>
      {!action ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAction('confirm')}
            className="bg-primary rounded-lg px-4 py-2 text-sm font-semibold text-white"
          >
            수령 확인
          </button>
          <button
            type="button"
            onClick={() => setAction('report')}
            className="border-danger bg-card text-danger rounded-lg border px-4 py-2 text-sm"
          >
            문제 신고
          </button>
        </div>
      ) : (
        <form onSubmit={execute} className="space-y-3">
          {action === 'confirm' ? (
            <p className="text-ink text-sm font-semibold">
              수령을 확정하면 보관 운임이 기사에게 지급됩니다. 확정하시겠습니까?
            </p>
          ) : (
            <>
              <label htmlFor="report-reason" className="text-sm font-semibold">
                신고 사유 (필수)
              </label>
              <textarea
                id="report-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                required
                rows={3}
                disabled={busy}
                className="border-line-strong bg-card block w-full rounded-lg border p-3 text-sm"
              />
              <p className="text-muted text-sm">신고하면 분쟁 처리 상태로 변경됩니다.</p>
            </>
          )}
          {error && (
            <p role="alert" className="text-danger text-sm">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy}
              className="bg-primary rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? '처리 중…' : action === 'confirm' ? '수령 확정' : '신고 접수'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setAction(null);
                setError('');
              }}
              className="border-line-strong bg-card rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
            >
              닫기
            </button>
            {error && (
              <button
                type="button"
                disabled={busy}
                onClick={onReload}
                className="text-primary-dark text-sm underline"
              >
                최신 정보 확인
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}

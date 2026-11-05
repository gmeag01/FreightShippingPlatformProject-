import { useRef, useState } from 'react';
import { cancelOrder } from '../../api/orders';

// 취소 사유를 검토하고 확인한 버전으로 요청한다. 실패 시 입력과 현재 오더를 보존한다.
export default function OrderCancel({ order, admin = false, onSuccess, onReload }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const inFlight = useRef(false);
  const allowed = order.status === 'REGISTERED' || (admin && order.status === 'ASSIGNED');
  if (!allowed) return null;

  async function submit() {
    if (inFlight.current || conflict) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const updated = await cancelOrder(order.id, order.version, reason.trim(), admin);
      onSuccess(updated);
    } catch (failure) {
      if (failure.status === 409 || failure.code === 'INVALID_STATUS_TRANSITION') {
        setConflict(true);
        setError('오더가 변경되었거나 이미 배차·운송 처리되었습니다. 최신 정보를 확인해 주세요.');
      } else if (failure.code === 'ORDER_PAYMENT_UNAVAILABLE') {
        setError(
          '환불 서비스를 사용할 수 없어 취소하지 못했습니다. 오더와 입력한 사유는 유지됩니다.',
        );
      } else setError(failure.message || '취소 요청을 완료하지 못했습니다.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
      >
        오더 취소
      </button>
    );
  return (
    <section
      aria-labelledby="cancel-title"
      className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-5"
    >
      <h2 id="cancel-title" className="font-bold text-red-900">
        오더 취소 요청
      </h2>
      <p className="text-sm text-red-800">
        {admin && order.status === 'ASSIGNED'
          ? '배정된 기사와 운송 일정을 확인한 뒤 취소해 주세요.'
          : '요청을 취소하면 차주가 이 오더를 수락할 수 없습니다.'}{' '}
        보관 운임의 환불도 함께 요청합니다.
      </p>
      {error && (
        <p role="alert" className="text-sm font-semibold text-red-800">
          {error}
        </p>
      )}
      {review ? (
        <div>
          <p className="text-sm font-semibold">아래 사유로 취소하시겠습니까?</p>
          <p className="mt-2 text-sm break-words whitespace-pre-wrap">{reason.trim()}</p>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!reason.trim()) {
              setError('취소 사유를 입력해 주세요.');
              return;
            }
            setError('');
            setReview(true);
          }}
        >
          <label htmlFor="cancel-reason" className="text-sm font-medium">
            취소 사유 (필수)
          </label>
          <textarea
            id="cancel-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            maxLength={255}
            rows={3}
            disabled={busy || conflict}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 text-sm"
          />
          <p className="text-xs text-gray-500">{reason.length} / 255자</p>
          <button
            type="submit"
            disabled={busy || conflict}
            className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            취소 내용 확인
          </button>
        </form>
      )}
      <div className="flex flex-wrap gap-2">
        {conflict ? (
          <button
            type="button"
            onClick={onReload}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm"
          >
            최신 정보 불러오기
          </button>
        ) : (
          <>
            {review && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setReview(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm disabled:opacity-50"
                >
                  사유 수정
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={submit}
                  className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? '취소 요청 중…' : '취소 확정'}
                </button>
              </>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setReview(false);
                setError('');
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm disabled:opacity-50"
            >
              닫기
            </button>
          </>
        )}
      </div>
    </section>
  );
}

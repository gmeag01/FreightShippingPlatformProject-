import { useEffect, useRef, useState } from 'react';
import { resolveDispute } from '../../api/disputes';
import { formatNumber } from '../../order/presentation';

const MAX_MEMO_LENGTH = 255;
const RESOLUTIONS = [
  { value: 'PAY_DRIVER', recipient: '차주에게', action: '지급' },
  { value: 'REFUND_SHIPPER', recipient: '화주에게', action: '환불' },
];
const button = 'min-h-11 rounded-md border px-4 text-sm font-semibold disabled:opacity-50';
const primary = `${button} border-transparent bg-primary text-white hover:bg-primary-dark`;
const secondary = `${button} border-line-strong bg-card text-copy`;

// 메모와 금액을 확인한 뒤에만 지급 또는 환불 요청을 보낸다.
export default function DisputeResolution({ dispute, onRefresh }) {
  const dialog = useRef(null);
  const memoInput = useRef(null);
  const submitting = useRef(false);
  const [memo, setMemo] = useState('');
  const [choice, setChoice] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const amount = `${formatNumber(dispute.fare)}원`;

  useEffect(() => {
    if (choice) dialog.current.showModal();
  }, [choice]);

  function openConfirmation(resolution) {
    if (!memo.trim()) {
      setError('처리 메모를 입력해 주세요.');
      memoInput.current.focus();
      return;
    }
    setError('');
    setChoice(resolution);
  }

  async function submit(event) {
    event.preventDefault();
    if (!choice || submitting.current) return;

    submitting.current = true;
    setBusy(true);
    try {
      await resolveDispute(dispute.orderId, choice.value, memo.trim());
      dialog.current.close();
      onRefresh(`${choice.action} 처리를 완료했습니다.`);
    } catch (failure) {
      dialog.current.close();
      if (failure.status === 409 || failure.status === 404) {
        onRefresh('분쟁 상태나 결제 정보가 바뀌었습니다. 최신 정보를 다시 조회합니다.');
      } else {
        setError(failure.message);
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="border-line bg-card space-y-4 rounded-lg border p-4 sm:p-5">
      <h2 className="text-h2 text-ink font-bold">처리</h2>
      <div>
        <label htmlFor="dispute-memo" className="text-copy text-sm font-medium">
          처리 메모 <span className="text-danger">*</span>
        </label>
        <textarea
          id="dispute-memo"
          ref={memoInput}
          required
          maxLength={MAX_MEMO_LENGTH}
          rows={3}
          value={memo}
          onChange={(event) => {
            setMemo(event.target.value);
            setError('');
          }}
          placeholder="결정 사유를 적어 주세요. 상태 이력에 남습니다."
          className="border-line-strong mt-1 block w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>
      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {RESOLUTIONS.map((resolution) => (
          <button
            key={resolution.value}
            type="button"
            className={resolution.value === 'PAY_DRIVER' ? primary : secondary}
            disabled={busy}
            onClick={() => openConfirmation(resolution)}
          >
            {resolution.recipient} {amount} {resolution.action}
          </button>
        ))}
      </div>
      <p className="text-muted text-sm">처리하면 되돌릴 수 없습니다.</p>
      <dialog
        ref={dialog}
        onClose={() => setChoice(null)}
        aria-labelledby="dispute-confirmation-title"
        onCancel={(event) => {
          if (submitting.current) event.preventDefault();
        }}
        className="bg-card text-copy backdrop:bg-ink/50 m-auto w-[calc(100%_-_2rem)] max-w-105 rounded-lg p-6 shadow-xl"
      >
        {choice && (
          <form onSubmit={submit} className="space-y-4">
            <h2 id="dispute-confirmation-title" className="text-h2 text-ink font-bold">
              {choice.action} 확인
            </h2>
            <p>
              오더 #{dispute.orderId}의 운임 {amount}을 {choice.recipient} {choice.action}할까요?
            </p>
            <p className="text-muted max-h-32 overflow-auto text-sm wrap-anywhere whitespace-pre-wrap">
              {memo.trim()}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={secondary}
                disabled={busy}
                onClick={() => dialog.current.close()}
              >
                돌아가기
              </button>
              <button type="submit" className={primary} disabled={busy}>
                {busy ? '처리 중…' : `${choice.action} 확정`}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </section>
  );
}

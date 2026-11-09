'use strict';

import { formatAmount, formatDateTime } from '../utils/driverOrder';

// 수정 전 값과 수정 후 값을 한 줄로 비교해 보여 준다. 값이 바뀌었으면 이전 값에 취소선을 긋는다.
function ChangedRow({ label, beforeText, afterText }) {
  const isChanged = beforeText !== afterText;
  return (
    <div className="border-line flex items-center justify-between gap-3 border-b py-2.5 text-sm last:border-b-0">
      <dt className="text-subtle">{label}</dt>
      <dd className="text-ink font-medium tabular-nums">
        {isChanged && <span className="text-subtle mr-2 line-through">{beforeText}</span>}
        <span className="font-semibold">{afterText}</span>
      </dd>
    </div>
  );
}

// 화주가 오더 내용을 수정해 버전이 달라졌을 때(ORDER_CHANGED) 바뀐 내용을 확인하고 다시 수락하는 창.
export default function OrderChangedModal({
  previousOrder,
  updatedOrder,
  isSubmitting,
  onClose,
  onConfirm,
}) {
  if (!previousOrder || !updatedOrder) return null;

  return (
    <div className="bg-ink/50 fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-changed-title"
        className="w-full max-w-105 rounded-[10px] bg-white p-6 break-keep shadow-lg"
      >
        <p className="text-caption text-subtle">차주 · 의뢰 수락</p>
        <h2 id="order-changed-title" className="text-h2 text-ink mt-1 font-bold">
          의뢰 내용이 바뀌었습니다
        </h2>
        <p className="text-body text-copy mt-3">
          화주가 내용을 수정했습니다. 바뀐 내용을 확인하고 다시 수락해 주세요.
        </p>

        <dl className="mt-4">
          <ChangedRow
            label="운임"
            beforeText={`${formatAmount(previousOrder.fare)}원`}
            afterText={`${formatAmount(updatedOrder.fare)}원`}
          />
          <ChangedRow
            label="상차 희망"
            beforeText={formatDateTime(previousOrder.pickupAt)}
            afterText={formatDateTime(updatedOrder.pickupAt)}
          />
        </dl>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="border-line-strong text-copy inline-flex min-h-11 items-center justify-center rounded-md border bg-white px-4.5 font-semibold whitespace-nowrap hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            닫기
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="bg-primary hover:bg-primary-dark disabled:text-muted inline-flex min-h-11 items-center justify-center rounded-md border border-transparent px-4.5 font-semibold whitespace-nowrap text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200"
          >
            {isSubmitting ? '처리 중…' : '바뀐 내용으로 수락'}
          </button>
        </div>
      </div>
    </div>
  );
}

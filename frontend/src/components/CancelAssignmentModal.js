'use strict';

import { useState } from 'react';
import { cancelOrderAssignment } from '../api/matching';

// 배차 취소 사유를 입력받아 취소를 요청하는 창. 사유는 필수이고, 상차 2시간 전부터는 서버가 거절한다.
// 설계 문서 3장: 거절 사유(DRIVER_CANCEL_CUTOFF_PASSED)는 서버 메시지를 그대로 보여 준다.
// 차주 내 운송 화면(DriverJobsPage)의 배차완료 오더에서 연다. 성공하면 onCancelled로 목록을 새로 불러온다.
export default function CancelAssignmentModal({ orderId, onClose, onCancelled }) {
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setErrorMessage('취소 사유를 입력해 주세요.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await cancelOrderAssignment(orderId, trimmedReason);
      await onCancelled();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-ink/50 fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-assignment-title"
        className="w-full max-w-105 rounded-[10px] bg-white p-6 break-keep shadow-lg"
      >
        <p className="text-caption text-subtle">차주 · 내 운송</p>
        <h2 id="cancel-assignment-title" className="text-h2 text-ink mt-1 font-bold">
          배차를 취소할까요?
        </h2>
        <label htmlFor="cancel-reason" className="text-copy mt-4 block text-sm font-medium">
          취소 사유 <span className="text-danger">*</span>
        </label>
        <textarea
          id="cancel-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          maxLength={200}
          className={`text-ink mt-1.5 min-h-24 w-full rounded-md bg-white px-3 py-2 text-sm ${
            errorMessage ? 'border-danger border-2' : 'border-line-strong border'
          }`}
          placeholder="차량 고장으로 상차가 어렵습니다."
        />
        {errorMessage && (
          <p className="text-caption text-danger mt-1.5 font-medium">{errorMessage}</p>
        )}
        <p className="text-caption text-muted mt-2">
          오더는 의뢰 목록으로 돌아가고, 화주에게 사유가 표시됩니다.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="border-line-strong text-copy inline-flex min-h-11 items-center justify-center rounded-md border bg-white px-4.5 font-semibold whitespace-nowrap hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            돌아가기
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="text-danger disabled:text-muted inline-flex min-h-11 items-center justify-center rounded-md border border-red-300 bg-white px-4.5 font-semibold whitespace-nowrap hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200"
          >
            {isSubmitting ? '처리 중…' : '배차 취소'}
          </button>
        </div>
      </div>
    </div>
  );
}

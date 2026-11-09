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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg">
        <h2 className="text-base font-bold text-gray-900">배차 취소</h2>
        <p className="mt-2 text-xs text-gray-500">
          상차 2시간 전부터는 직접 취소할 수 없습니다. 취소하면 이 오더는 다시 의뢰 목록에 올라가고,
          취소 횟수가 기록됩니다.
        </p>
        <label htmlFor="cancel-reason" className="mt-3 block text-sm font-medium text-gray-800">
          취소 사유
        </label>
        <textarea
          id="cancel-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          maxLength={200}
          className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm"
          placeholder="예: 차량 점검이 필요합니다"
        />
        {errorMessage && <p className="mt-2 text-sm text-red-600">{errorMessage}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            닫기
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isSubmitting ? '처리 중...' : '배차 취소'}
          </button>
        </div>
      </div>
    </div>
  );
}

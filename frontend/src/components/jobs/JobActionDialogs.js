import CancelAssignmentModal from '../CancelAssignmentModal';
import JobActionDialog from './JobActionDialog';

// useJobActions의 dialogs를 받아 상차·하차 확인창과 배차 취소 창 중 열린 것을 그린다.
export default function JobActionDialogs({
  pendingAction,
  cancelTarget,
  submittingId,
  onCloseAction,
  onConfirmAction,
  onCloseCancel,
  onCancelled,
}) {
  return (
    <>
      {pendingAction && (
        <JobActionDialog
          job={pendingAction.job}
          action={pendingAction.action}
          isSubmitting={submittingId === pendingAction.job.orderId}
          onCancel={onCloseAction}
          onConfirm={onConfirmAction}
        />
      )}
      {cancelTarget && (
        <CancelAssignmentModal
          orderId={cancelTarget.orderId}
          onClose={onCloseCancel}
          onCancelled={onCancelled}
        />
      )}
    </>
  );
}

// 처리 결과 알림. 성공은 안내 알림, 실패는 오류 알림 모양이다.
export function JobBanner({ banner }) {
  if (!banner) return null;
  const className =
    banner.type === 'success'
      ? 'border-blue-200 bg-primary-soft text-blue-900'
      : 'border-red-200 bg-danger-soft text-red-800';
  return (
    <p role="status" className={`rounded-lg border px-4 py-3.5 text-sm ${className}`}>
      {banner.text}
    </p>
  );
}

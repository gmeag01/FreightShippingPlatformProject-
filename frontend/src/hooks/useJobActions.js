import { useState } from 'react';
import { completeDropoff, completePickup } from '../api/jobs';

const ACTION_REQUESTS = Object.freeze({ pickup: completePickup, dropoff: completeDropoff });

// 진행 버튼이 실패했을 때 보여 줄 문구. 상태가 이미 바뀐 경우(409·404)는 새로 불러왔다고 알린다.
function describeActionFailure(error) {
  const isStale = error.status === 409 || error.status === 404;
  return isStale ? `${error.message} 최신 정보로 다시 불러왔습니다.` : error.message;
}

// 내 운송 목록과 운송 상세가 함께 쓰는 진행 버튼(상차·하차)과 배차 취소 처리.
// 처리 결과는 banner로 알리고, 성공·실패와 관계없이 reload로 최신 상태를 다시 불러온다.
export default function useJobActions(reload) {
  const [banner, setBanner] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const confirmAction = async () => {
    const { job, action } = pendingAction;
    setSubmittingId(job.orderId);
    try {
      await ACTION_REQUESTS[action.type](job.orderId);
      setBanner({ type: 'success', text: `#${job.orderId} ${action.label}로 바꿨습니다.` });
    } catch (error) {
      setBanner({ type: 'error', text: describeActionFailure(error) });
    } finally {
      setSubmittingId(null);
      setPendingAction(null);
      reload();
    }
  };

  const finishCancelAssignment = () => {
    setBanner({ type: 'success', text: `#${cancelTarget.orderId} 배차를 취소했습니다.` });
    setCancelTarget(null);
    reload();
  };

  return {
    banner,
    setBanner,
    submittingId,
    requestAction: (job, action) => setPendingAction({ job, action }),
    requestCancel: setCancelTarget,
    dialogs: {
      pendingAction,
      cancelTarget,
      submittingId,
      onCloseAction: () => setPendingAction(null),
      onConfirmAction: confirmAction,
      onCloseCancel: () => setCancelTarget(null),
      onCancelled: finishCancelAssignment,
    },
  };
}

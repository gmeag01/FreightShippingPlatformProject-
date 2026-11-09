'use strict';

import { useState } from 'react';
import { acceptOrder, fetchOpenOrderDetail } from '../api/matching';
import { buildMismatchMessages, checkMyVehicleMismatch } from '../utils/driverOrder';

// 차주의 의뢰 수락 흐름을 한곳에 모은 훅. 목록 화면과 상세 화면이 같은 규칙으로 수락한다.
// 수락 전 경고 확인(차종·중량 불일치), 서버 오류 코드별 처리(VEHICLE_MISMATCH, ORDER_CHANGED 등)를 맡는다.
export default function useAcceptOrder({
  onAccepted,
  onOrderChanged,
  onOrderUnavailable,
  onFailed,
}) {
  const [submittingId, setSubmittingId] = useState(null);
  const [mismatchModal, setMismatchModal] = useState(null);
  const [changedModal, setChangedModal] = useState(null);

  // 실제로 서버에 수락을 요청한다. confirmMismatch가 true면 경고를 확인한 것으로 본다.
  const executeAccept = async (order, confirmMismatch) => {
    setSubmittingId(order.id);
    try {
      await acceptOrder(order.id, { version: order.version, confirmMismatch });
      setMismatchModal(null);
      setChangedModal(null);
      await onAccepted(order);
    } catch (error) {
      await handleAcceptError(order, error);
    } finally {
      setSubmittingId(null);
    }
  };

  // 화주가 오더 내용을 수정한 경우 최신 상세를 조회해 변경 비교 확인창을 띄운다.
  const openChangedModal = async (previousOrder) => {
    await onOrderChanged(previousOrder);
    try {
      const updatedOrder = await fetchOpenOrderDetail(previousOrder.id);
      setChangedModal({ previousOrder, updatedOrder });
    } catch {
      setChangedModal(null);
    }
  };

  // 서버가 돌려준 오류 코드에 따라 경고창·안내·새로고침 중 알맞은 후속 동작을 고른다.
  const handleAcceptError = async (order, error) => {
    if (error.code === 'VEHICLE_MISMATCH') {
      const messages = buildMismatchMessages(error.fieldErrors ?? {});
      const fallbackMessage = '보유 차량과 오더 요구 조건이 다릅니다. 계속하시겠습니까?';
      setMismatchModal({ order, messages: messages.length > 0 ? messages : [fallbackMessage] });
      return;
    }
    setMismatchModal(null);
    if (error.code === 'ORDER_CHANGED') {
      await openChangedModal(order);
      return;
    }
    if (error.code === 'ORDER_ALREADY_ASSIGNED') {
      await onOrderUnavailable(order, error);
      return;
    }
    onFailed(error);
  };

  // 수락 버튼을 눌렀을 때: 내 차량과 맞지 않으면 먼저 경고창을 띄우고, 맞으면 바로 수락한다.
  const requestAccept = (order, myVehicle) => {
    setChangedModal(null);
    const messages = checkMyVehicleMismatch(myVehicle, order);
    if (messages.length > 0) {
      setMismatchModal({ order, messages });
      return;
    }
    executeAccept(order, false);
  };

  return {
    submittingId,
    mismatchModal,
    changedModal,
    requestAccept,
    executeAccept,
    closeMismatchModal: () => setMismatchModal(null),
    closeChangedModal: () => setChangedModal(null),
  };
}

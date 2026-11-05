package com.freight.delivery.service;

import com.freight.delivery.dto.DeliveryStatusResponse;
import com.freight.delivery.dto.ReportIssueRequest;
import com.freight.delivery.dto.ResolveDisputeRequest;
import com.freight.global.exception.BusinessException;
import com.freight.order.entity.DisputeResolution;
import com.freight.order.entity.StatusChange;
import com.freight.order.service.OrderService;
import com.freight.payment.service.PaymentService;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 배차 이후의 운송 진행(상차, 하차, 수령 확인, 문제 신고, 분쟁 처리)을 맡는 서비스.
 * 설계 문서 3장: 오더 상태 변경과 결제 변경을 한 트랜잭션으로 묶어, 하나가 실패하면 둘 다 되돌린다.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class DeliveryService {

    private final OrderService orderService;
    private final PaymentService paymentService;

    /**
     * 배정된 차주가 상차를 완료해 운송을 시작한다.
     *
     * @param orderId 오더 ID
     * @param driverId 요청 차주 회원 ID
     * @return 오더의 새 상태
     * @throws BusinessException 배정된 차주가 아님(NOT_ORDER_OWNER), 상태 오류(INVALID_STATUS_TRANSITION)
     */
    public DeliveryStatusResponse pickup(Long orderId, Long driverId) {
        StatusChange change =
                orderService.changeStatus(orderId, driverId, null, (order, driver) -> order.startTransit(driver));
        return toResponse(orderId, change);
    }

    /**
     * 배정된 차주가 하차를 완료해 화주의 수령 확인을 기다린다.
     *
     * @param orderId 오더 ID
     * @param driverId 요청 차주 회원 ID
     * @return 오더의 새 상태
     * @throws BusinessException 배정된 차주가 아님(NOT_ORDER_OWNER), 상태 오류(INVALID_STATUS_TRANSITION)
     */
    public DeliveryStatusResponse dropoff(Long orderId, Long driverId) {
        StatusChange change = orderService.changeStatus(
                orderId, driverId, null, (order, driver) -> order.completeDropoff(driver, LocalDateTime.now()));
        return toResponse(orderId, change);
    }

    /**
     * 화주가 수령을 확인하면 운송을 완료하고 보관 중인 운임을 차주에게 지급한다.
     *
     * @param orderId 오더 ID
     * @param shipperId 요청 화주 회원 ID
     * @return 오더의 새 상태
     * @throws BusinessException 본인 오더가 아님(NOT_ORDER_OWNER), 상태 오류(INVALID_STATUS_TRANSITION),
     *         결제 없음(PAYMENT_NOT_FOUND)
     */
    public DeliveryStatusResponse confirm(Long orderId, Long shipperId) {
        StatusChange change = orderService.changeStatus(
                orderId, shipperId, null, (order, shipper) -> order.confirmReceipt(shipper, LocalDateTime.now()));
        paymentService.release(orderId);
        return toResponse(orderId, change);
    }

    /**
     * 화주가 문제를 신고해 분쟁으로 넘긴다. 운임은 관리자가 처리할 때까지 계속 보관한다.
     *
     * @param orderId 오더 ID
     * @param shipperId 요청 화주 회원 ID
     * @param request 신고 사유. 상태 이력에 남는다
     * @return 오더의 새 상태
     * @throws BusinessException 본인 오더가 아님(NOT_ORDER_OWNER), 상태 오류(INVALID_STATUS_TRANSITION)
     */
    public DeliveryStatusResponse report(Long orderId, Long shipperId, ReportIssueRequest request) {
        StatusChange change = orderService.changeStatus(
                orderId, shipperId, request.reason(), (order, shipper) -> order.reportIssue(shipper));
        return toResponse(orderId, change);
    }

    /**
     * 관리자가 분쟁을 처리한다. 지급이면 운송완료와 차주 지급, 환불이면 취소와 화주 환불로 끝난다.
     *
     * @param orderId 오더 ID
     * @param adminId 요청 관리자 회원 ID
     * @param request 처리 방법과 처리 메모. 메모는 상태 이력에 남는다
     * @return 오더의 새 상태
     * @throws BusinessException 관리자가 아님(FORBIDDEN), 상태 오류(INVALID_STATUS_TRANSITION),
     *         결제 없음(PAYMENT_NOT_FOUND)
     */
    public DeliveryStatusResponse resolveDispute(Long orderId, Long adminId, ResolveDisputeRequest request) {
        StatusChange change = orderService.changeStatus(
                orderId,
                adminId,
                request.memo(),
                (order, admin) -> order.resolveDispute(admin, request.resolution(), LocalDateTime.now()));
        if (request.resolution() == DisputeResolution.PAY_DRIVER) {
            paymentService.release(orderId);
        } else {
            paymentService.refund(orderId);
        }
        return toResponse(orderId, change);
    }

    private DeliveryStatusResponse toResponse(Long orderId, StatusChange change) {
        return new DeliveryStatusResponse(orderId, change.to());
    }
}

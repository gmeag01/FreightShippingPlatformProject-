package com.freight.order.service;

import com.freight.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** C의 오더 결제 계약을 E의 결제 서비스에 연결한다. 오더 트랜잭션에 함께 참여한다. */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.order.payment-enabled", havingValue = "true", matchIfMissing = true)
public class OrderPaymentAdapter implements OrderPaymentPort {
    private final PaymentService paymentService;

    /**
     * 등록 운임을 보관한다.
     * @param orderId 오더 ID
     * @param amount 보관 운임
     * @throws RuntimeException 결제 보관 실패 시
     */
    @Override
    public void hold(Long orderId, long amount) {
        paymentService.hold(orderId, amount);
    }

    /**
     * 운임 변경 차액을 처리한다.
     * @param orderId 오더 ID
     * @param newAmount 변경된 전체 운임
     * @throws RuntimeException 차액 처리 실패 시
     */
    @Override
    public void adjust(Long orderId, long newAmount) {
        paymentService.adjust(orderId, newAmount);
    }

    /**
     * 취소 오더의 보관 운임을 환불한다.
     * @param orderId 오더 ID
     * @throws RuntimeException 환불 실패 시
     */
    @Override
    public void refund(Long orderId) {
        paymentService.refund(orderId);
    }
}

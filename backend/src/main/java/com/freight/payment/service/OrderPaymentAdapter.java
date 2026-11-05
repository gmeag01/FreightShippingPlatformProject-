package com.freight.payment.service;

import com.freight.order.service.OrderPaymentPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 오더 도메인의 결제 요청을 PaymentService로 넘긴다.
 * PaymentService가 포트를 직접 구현하면 포트를 목으로 바꾸는 오더 테스트에서 PaymentService 빈까지 사라지므로 따로 둔다.
 */
@Component
@RequiredArgsConstructor
public class OrderPaymentAdapter implements OrderPaymentPort {

    private final PaymentService paymentService;

    @Override
    public void hold(Long orderId, long amount) {
        paymentService.hold(orderId, amount);
    }

    @Override
    public void adjust(Long orderId, long newAmount) {
        paymentService.adjust(orderId, newAmount);
    }

    @Override
    public void refund(Long orderId) {
        paymentService.refund(orderId);
    }
}

package com.freight.payment.service;

/**
 * 실제 돈을 움직이는 결제 대행사(PG) 연결부. 지금은 더미이고, 나중에 PG 테스트 모드 구현으로 바꿀 수 있다.
 * 실패하면 예외를 던져 오더와 결제 변경이 함께 되돌아가게 한다.
 */
public interface PaymentGateway {

    /** 화주에게서 금액을 결제한다. */
    void charge(Long orderId, long amount);

    /** 화주에게 금액을 환불한다. */
    void refund(Long orderId, long amount);

    /** 차주에게 금액을 지급한다. */
    void payout(Long orderId, long amount);
}

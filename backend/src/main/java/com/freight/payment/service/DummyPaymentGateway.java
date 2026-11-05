package com.freight.payment.service;

import org.springframework.stereotype.Component;

/** 설계 문서 3장: 결제·지급·환불은 더미이므로 실제 돈을 움직이지 않고 항상 성공한다. */
@Component
public class DummyPaymentGateway implements PaymentGateway {

    @Override
    public void charge(Long orderId, long amount) {}

    @Override
    public void refund(Long orderId, long amount) {}

    @Override
    public void payout(Long orderId, long amount) {}
}

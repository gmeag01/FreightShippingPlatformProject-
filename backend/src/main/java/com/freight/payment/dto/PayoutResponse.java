package com.freight.payment.dto;

import com.freight.payment.entity.PaymentTransaction;
import java.time.LocalDateTime;

/** 차주 지급 내역의 한 줄. */
public record PayoutResponse(Long orderId, long amount, LocalDateTime paidAt) {

    public static PayoutResponse from(PaymentTransaction transaction) {
        return new PayoutResponse(
                transaction.getPayment().getOrder().getId(), transaction.getAmount(), transaction.getCreatedAt());
    }
}

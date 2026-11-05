package com.freight.payment.entity;

/** 결제 거래 종류. */
public enum PaymentTransactionType {
    CHARGE,
    ADDITIONAL_CHARGE,
    PARTIAL_REFUND,
    PAYOUT,
    REFUND
}

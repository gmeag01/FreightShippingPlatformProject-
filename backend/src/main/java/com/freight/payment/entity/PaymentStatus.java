package com.freight.payment.entity;

/** 결제 상태. HELD에서 RELEASED 또는 REFUNDED로 한 번만 바뀐다. */
public enum PaymentStatus {
    HELD,
    RELEASED,
    REFUNDED
}

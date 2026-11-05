package com.freight.order.entity;

/** 오더 상태. Order 엔티티의 상태 전이 메서드로만 바꾼다. */
public enum OrderStatus {
    REGISTERED,
    ASSIGNED,
    IN_TRANSIT,
    AWAITING_CONFIRM,
    COMPLETED,
    DISPUTED,
    CANCELLED
}

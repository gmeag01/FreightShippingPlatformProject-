package com.freight.order.entity;

public enum OrderStatus {
    REGISTERED,
    ASSIGNED,
    IN_TRANSIT,
    AWAITING_CONFIRM,
    COMPLETED,
    DISPUTED,
    CANCELLED
}

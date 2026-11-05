package com.freight.order.entity;

/** 분쟁 처리 결과. 차주 지급 또는 화주 환불이다. */
public enum DisputeResolution {
    PAY_DRIVER,
    REFUND_SHIPPER
}

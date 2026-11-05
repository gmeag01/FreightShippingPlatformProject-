package com.freight.delivery.dto;

import com.freight.order.entity.OrderStatus;

/** 운송 진행 요청 뒤 오더의 새 상태를 돌려주는 응답. */
public record DeliveryStatusResponse(Long orderId, OrderStatus status) {}

package com.freight.matching.dto;

import com.freight.order.entity.OrderStatus;
import java.time.LocalDateTime;

/** 오더 수락 결과. */
public record AcceptOrderResponse(
        Long orderId, OrderStatus status, Long driverId, LocalDateTime assignedAt, long version) {}

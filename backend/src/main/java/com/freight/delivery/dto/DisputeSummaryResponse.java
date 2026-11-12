package com.freight.delivery.dto;

import com.freight.order.entity.Order;
import com.freight.order.entity.OrderStatus;
import com.freight.order.entity.OrderStatusHistory;
import java.time.LocalDateTime;

/** 관리자 분쟁 목록의 한 줄. */
public record DisputeSummaryResponse(
        Long orderId,
        String pickupRegion,
        String dropoffRegion,
        LocalDateTime reportedAt,
        String reason,
        OrderStatus status) {

    public DisputeSummaryResponse(
            Long orderId, String pickupRegion, String dropoffRegion, LocalDateTime reportedAt, String reason) {
        this(orderId, pickupRegion, dropoffRegion, reportedAt, reason, OrderStatus.DISPUTED);
    }

    public static DisputeSummaryResponse from(Order order, OrderStatusHistory report) {
        return new DisputeSummaryResponse(
                order.getId(),
                order.getPickup().getRegion(),
                order.getDropoff().getRegion(),
                report.getCreatedAt(),
                report.getMemo(),
                order.getStatus());
    }
}

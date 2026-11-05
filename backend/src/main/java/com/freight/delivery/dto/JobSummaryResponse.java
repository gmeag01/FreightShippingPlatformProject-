package com.freight.delivery.dto;

import com.freight.order.entity.Order;
import com.freight.order.entity.OrderStatus;
import java.time.LocalDateTime;

/** 차주 내 운송 목록의 한 줄. driverCancelableUntil은 배차완료 상태에서만 값이 있다. */
public record JobSummaryResponse(
        Long orderId,
        OrderStatus status,
        JobLocationResponse pickup,
        JobLocationResponse dropoff,
        LocalDateTime pickupAt,
        LocalDateTime arriveBy,
        long fare,
        LocalDateTime driverCancelableUntil) {

    public static JobSummaryResponse from(Order order, LocalDateTime driverCancelableUntil) {
        return new JobSummaryResponse(
                order.getId(),
                order.getStatus(),
                JobLocationResponse.from(order.getPickup()),
                JobLocationResponse.from(order.getDropoff()),
                order.getPickupAt(),
                order.getArriveBy(),
                order.getFare(),
                driverCancelableUntil);
    }
}

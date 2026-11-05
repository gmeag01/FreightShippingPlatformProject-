package com.freight.order.dto;

import com.freight.order.entity.Order;
import com.freight.order.entity.OrderStatus;
import com.freight.vehicle.entity.VehicleType;
import java.time.LocalDateTime;

/** 목록에는 지역만 표시하고, 상차 희망 시각이 지난 미배차 요청을 별도로 표시한다. */
public record OrderSummaryResponse(
        Long id,
        OrderStatus status,
        String pickupRegion,
        String dropoffRegion,
        String itemName,
        int weightKg,
        VehicleType requiredVehicleType,
        LocalDateTime pickupAt,
        LocalDateTime arriveBy,
        long fare,
        long version,
        boolean isUnassigned) {
    public static OrderSummaryResponse from(Order order, LocalDateTime now) {
        return new OrderSummaryResponse(
                order.getId(),
                order.getStatus(),
                order.getPickup().getRegion(),
                order.getDropoff().getRegion(),
                order.getCargo().getItemName(),
                order.getCargo().getWeightKg(),
                order.getRequiredVehicleType(),
                order.getPickupAt(),
                order.getArriveBy(),
                order.getFare(),
                order.getVersion(),
                order.getStatus() == OrderStatus.REGISTERED
                        && order.getPickupAt().isBefore(now));
    }
}

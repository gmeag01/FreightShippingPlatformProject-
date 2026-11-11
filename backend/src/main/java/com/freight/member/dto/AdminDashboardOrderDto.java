package com.freight.member.dto;

import com.freight.order.entity.Order;
import com.freight.vehicle.entity.BodyType;
import com.freight.vehicle.entity.VehicleType;
import java.time.LocalDateTime;

/**
 * 대시보드 통계 카드 클릭 시 모달에 표시되는 상세 오더 정보 DTO.
 */
public record AdminDashboardOrderDto(
        Long orderId,
        String shipperName,
        String driverName,
        String pickupRegion,
        String dropoffRegion,
        VehicleType requiredVehicleType,
        BodyType bodyType,
        String itemName,
        long fare,
        String status,
        LocalDateTime pickupAt,
        LocalDateTime actionAt) {

    public static AdminDashboardOrderDto of(Order order, LocalDateTime actionAt) {
        return new AdminDashboardOrderDto(
                order.getId(),
                order.getShipper() != null ? order.getShipper().getName() : "-",
                order.getDriver() != null ? order.getDriver().getName() : "-",
                order.getPickup().getRegion(),
                order.getDropoff().getRegion(),
                order.getRequiredVehicleType(),
                order.getBodyType(),
                order.getCargo() != null ? order.getCargo().getItemName() : "-",
                order.getFare(),
                order.getStatus().name(),
                order.getPickupAt(),
                actionAt);
    }
}

package com.freight.member.dto;

import com.freight.order.entity.Order;
import com.freight.vehicle.entity.BodyType;
import com.freight.vehicle.entity.VehicleType;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 관리자 대시보드 통계 및 긴급 조치 항목 응답 DTO.
 * (설계 문서 6장, 로드맵 4주차 과업)
 */
public record AdminDashboardResponse(
        SummaryMetrics summary, List<UrgentOrderDto> urgentOrders, List<DisputeOrderDto> disputeOrders) {

    public record SummaryMetrics(
            long todayRegistered,
            long yesterdayRegistered,
            long todayAssigned,
            long yesterdayAssigned,
            long todayCompleted,
            long yesterdayCompleted,
            long unassignedCount,
            long disputedCount) {}

    public record UrgentOrderDto(
            Long orderId,
            String shipperName,
            String pickupRegion,
            String dropoffRegion,
            VehicleType requiredVehicleType,
            BodyType bodyType,
            LocalDateTime pickupAt,
            long fare,
            String status) {

        public static UrgentOrderDto from(Order order) {
            return new UrgentOrderDto(
                    order.getId(),
                    order.getShipper() != null ? order.getShipper().getName() : "-",
                    order.getPickup().getRegion(),
                    order.getDropoff().getRegion(),
                    order.getRequiredVehicleType(),
                    order.getBodyType(),
                    order.getPickupAt(),
                    order.getFare(),
                    order.getStatus().name());
        }
    }

    public record DisputeOrderDto(
            Long orderId,
            String pickupRegion,
            String dropoffRegion,
            LocalDateTime createdAt,
            long fare,
            String status) {

        public static DisputeOrderDto from(Order order) {
            return new DisputeOrderDto(
                    order.getId(),
                    order.getPickup().getRegion(),
                    order.getDropoff().getRegion(),
                    order.getCreatedAt(),
                    order.getFare(),
                    order.getStatus().name());
        }
    }
}

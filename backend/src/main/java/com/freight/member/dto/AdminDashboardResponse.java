package com.freight.member.dto;

import com.freight.delivery.dto.DisputeSummaryResponse;
import com.freight.order.entity.Order;
import com.freight.order.entity.OrderStatus;
import com.freight.vehicle.entity.BodyType;
import com.freight.vehicle.entity.VehicleType;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 관리자 대시보드 통계 및 긴급 조치 항목 응답 DTO.
 * (설계 문서 6장, 로드맵 4주차 과업)
 */
public record AdminDashboardResponse(
        SummaryMetrics summary, List<UrgentOrderDto> urgentOrders, List<DisputeSummaryResponse> disputeOrders) {

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
            String status,
            boolean isUnassigned) {

        // 화주 오더 목록(OrderSummaryResponse)과 같은 규칙: 상차 희망 시각이 지난 REGISTERED만 '미배차'다.
        public static UrgentOrderDto from(Order order, LocalDateTime now) {
            return new UrgentOrderDto(
                    order.getId(),
                    order.getShipper() != null ? order.getShipper().getName() : "-",
                    order.getPickup().getRegion(),
                    order.getDropoff().getRegion(),
                    order.getRequiredVehicleType(),
                    order.getBodyType(),
                    order.getPickupAt(),
                    order.getFare(),
                    order.getStatus().name(),
                    order.getStatus() == OrderStatus.REGISTERED
                            && order.getPickupAt().isBefore(now));
        }
    }
}

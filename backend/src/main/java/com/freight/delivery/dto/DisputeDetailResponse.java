package com.freight.delivery.dto;

import com.freight.order.dto.StatusHistoryResponse;
import com.freight.order.entity.Order;
import com.freight.order.entity.OrderStatus;
import com.freight.order.entity.OrderStatusHistory;
import com.freight.payment.entity.PaymentStatus;
import com.freight.vehicle.entity.Vehicle;
import com.freight.vehicle.entity.VehicleType;
import java.time.LocalDateTime;
import java.util.List;

/** 관리자 분쟁 상세. 판단에 필요한 신고 사유, 회원, 차량, 화물, 결제 상태, 상태 이력을 담는다. 차량이 없으면 차량 값은 null이다. */
public record DisputeDetailResponse(
        Long orderId,
        OrderStatus status,
        String pickupRegion,
        String dropoffRegion,
        long fare,
        PaymentStatus paymentStatus,
        String reason,
        LocalDateTime reportedAt,
        String shipperName,
        String driverName,
        VehicleType vehicleType,
        String plateNumber,
        String itemName,
        int weightKg,
        List<StatusHistoryResponse> history) {

    public static DisputeDetailResponse from(
            Order order,
            PaymentStatus paymentStatus,
            OrderStatusHistory report,
            Vehicle vehicle,
            List<OrderStatusHistory> history) {
        return new DisputeDetailResponse(
                order.getId(),
                order.getStatus(),
                order.getPickup().getRegion(),
                order.getDropoff().getRegion(),
                order.getFare(),
                paymentStatus,
                report.getMemo(),
                report.getCreatedAt(),
                order.getShipper().getName(),
                order.getDriver().getName(),
                vehicle != null ? vehicle.getVehicleType() : null,
                vehicle != null ? vehicle.getPlateNumber() : null,
                order.getCargo().getItemName(),
                order.getCargo().getWeightKg(),
                history.stream().map(StatusHistoryResponse::from).toList());
    }
}

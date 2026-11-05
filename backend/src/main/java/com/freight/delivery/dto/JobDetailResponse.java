package com.freight.delivery.dto;

import com.freight.order.entity.Cargo;
import com.freight.order.entity.CargoType;
import com.freight.order.entity.LoadingMethod;
import com.freight.order.entity.Order;
import com.freight.order.entity.OrderStatus;
import com.freight.order.entity.OrderStatusHistory;
import com.freight.order.entity.PackageUnit;
import com.freight.payment.entity.PaymentStatus;
import com.freight.vehicle.entity.BodyType;
import com.freight.vehicle.entity.VehicleType;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 차주 운송 상세. 설계 문서 7장: 화면이 설정값을 몰라도 되도록 마감 시각을 계산해서 보낸다.
 * driverCancelableUntil은 배차완료, autoConfirmAt은 수령확인대기 상태에서만 값이 있다.
 */
public record JobDetailResponse(
        Long orderId,
        OrderStatus status,
        JobLocationResponse pickup,
        JobLocationResponse dropoff,
        LocalDateTime pickupAt,
        LocalDateTime arriveBy,
        double distanceKm,
        VehicleType requiredVehicleType,
        BodyType bodyType,
        LoadingMethod loadingMethod,
        String memo,
        String itemName,
        CargoType cargoType,
        int weightKg,
        int quantity,
        PackageUnit packageUnit,
        Integer widthCm,
        Integer depthCm,
        Integer heightCm,
        boolean fragile,
        boolean noStack,
        String shipperName,
        long fare,
        PaymentStatus paymentStatus,
        LocalDateTime driverCancelableUntil,
        LocalDateTime autoConfirmAt,
        List<StatusHistoryResponse> history) {

    public static JobDetailResponse from(
            Order order,
            PaymentStatus paymentStatus,
            LocalDateTime driverCancelableUntil,
            LocalDateTime autoConfirmAt,
            List<OrderStatusHistory> history) {
        Cargo cargo = order.getCargo();
        return new JobDetailResponse(
                order.getId(),
                order.getStatus(),
                JobLocationResponse.from(order.getPickup()),
                JobLocationResponse.from(order.getDropoff()),
                order.getPickupAt(),
                order.getArriveBy(),
                order.getDistanceKm(),
                order.getRequiredVehicleType(),
                order.getBodyType(),
                order.getLoadingMethod(),
                order.getMemo(),
                cargo.getItemName(),
                cargo.getCargoType(),
                cargo.getWeightKg(),
                cargo.getQuantity(),
                cargo.getPackageUnit(),
                cargo.getWidthCm(),
                cargo.getDepthCm(),
                cargo.getHeightCm(),
                cargo.isFragile(),
                cargo.isNoStack(),
                order.getShipper().getName(),
                order.getFare(),
                paymentStatus,
                driverCancelableUntil,
                autoConfirmAt,
                history.stream().map(StatusHistoryResponse::from).toList());
    }
}

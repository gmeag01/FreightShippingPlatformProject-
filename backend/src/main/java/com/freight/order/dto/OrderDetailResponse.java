package com.freight.order.dto;

import com.freight.order.entity.*;
import com.freight.vehicle.entity.BodyType;
import com.freight.vehicle.entity.Vehicle;
import com.freight.vehicle.entity.VehicleType;
import java.time.LocalDateTime;
import java.util.List;

/** 엔티티를 노출하지 않고 조회자 권한에 따라 주소·연락처·메모·이력을 가린다. */
public record OrderDetailResponse(
        Long id,
        OrderStatus status,
        long version,
        LocationResponse pickup,
        LocationResponse dropoff,
        CargoResponse cargo,
        LocalDateTime pickupAt,
        LocalDateTime arriveBy,
        VehicleType requiredVehicleType,
        BodyType bodyType,
        LoadingMethod loadingMethod,
        String memo,
        long fare,
        long recommendedFare,
        double distanceKm,
        Long driverId,
        String driverName,
        String driverPhone,
        VehicleType driverVehicleType,
        BodyType driverBodyType,
        String driverPlateNumber,
        LocalDateTime autoConfirmAt,
        LocalDateTime driverCancelableUntil,
        boolean isUnassigned,
        boolean isDriverCancelled,
        List<StatusHistoryResponse> history) {
    public static OrderDetailResponse from(
            Order order,
            List<OrderStatusHistory> history,
            boolean canViewPrivate,
            Vehicle driverVehicle,
            long autoConfirmHours,
            long cancelCutoffHours) {
        OrderStatusHistory last = history.isEmpty() ? null : history.getLast();
        boolean driverCancelled = last != null
                && last.getFromStatus() == OrderStatus.ASSIGNED
                && last.getToStatus() == OrderStatus.REGISTERED;
        return new OrderDetailResponse(
                order.getId(),
                order.getStatus(),
                order.getVersion(),
                LocationResponse.from(order.getPickup(), canViewPrivate),
                LocationResponse.from(order.getDropoff(), canViewPrivate),
                CargoResponse.from(order.getCargo()),
                order.getPickupAt(),
                order.getArriveBy(),
                order.getRequiredVehicleType(),
                order.getBodyType(),
                order.getLoadingMethod(),
                canViewPrivate ? order.getMemo() : null,
                order.getFare(),
                order.getRecommendedFare(),
                order.getDistanceKm(),
                order.getDriver() == null ? null : order.getDriver().getId(),
                order.getDriver() == null ? null : order.getDriver().getName(),
                canViewPrivate && order.getDriver() != null ? order.getDriver().getPhone() : null,
                driverVehicle != null && canViewPrivate ? driverVehicle.getVehicleType() : null,
                driverVehicle != null && canViewPrivate ? driverVehicle.getBodyType() : null,
                driverVehicle != null && canViewPrivate ? driverVehicle.getPlateNumber() : null,
                canViewPrivate && order.getStatus() == OrderStatus.AWAITING_CONFIRM && order.getDroppedOffAt() != null
                        ? order.getDroppedOffAt().plusHours(autoConfirmHours)
                        : null,
                canViewPrivate && order.getStatus() == OrderStatus.ASSIGNED
                        ? order.getPickupAt().minusHours(cancelCutoffHours)
                        : null,
                order.getStatus() == OrderStatus.REGISTERED
                        && order.getPickupAt().isBefore(LocalDateTime.now()),
                driverCancelled,
                canViewPrivate
                        ? history.stream().map(StatusHistoryResponse::from).toList()
                        : List.of());
    }

    public record LocationResponse(
            String address,
            String detailAddress,
            String region,
            Double latitude,
            Double longitude,
            String contactName,
            String contactPhone) {
        static LocationResponse from(Location location, boolean full) {
            return new LocationResponse(
                    full ? location.getAddress() : location.getRegion(),
                    full ? location.getDetailAddress() : null,
                    location.getRegion(),
                    full ? location.getLatitude() : null,
                    full ? location.getLongitude() : null,
                    full ? location.getContactName() : null,
                    full ? location.getContactPhone() : null);
        }
    }

    public record CargoResponse(
            String itemName,
            CargoType cargoType,
            int weightKg,
            int quantity,
            PackageUnit packageUnit,
            Integer widthCm,
            Integer depthCm,
            Integer heightCm,
            boolean fragile,
            boolean noStack) {
        static CargoResponse from(Cargo cargo) {
            return new CargoResponse(
                    cargo.getItemName(),
                    cargo.getCargoType(),
                    cargo.getWeightKg(),
                    cargo.getQuantity(),
                    cargo.getPackageUnit(),
                    cargo.getWidthCm(),
                    cargo.getDepthCm(),
                    cargo.getHeightCm(),
                    cargo.isFragile(),
                    cargo.isNoStack());
        }
    }
}

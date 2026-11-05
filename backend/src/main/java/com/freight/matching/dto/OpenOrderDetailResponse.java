package com.freight.matching.dto;

import com.freight.order.entity.Cargo;
import com.freight.order.entity.CargoType;
import com.freight.order.entity.LoadingMethod;
import com.freight.order.entity.Order;
import com.freight.order.entity.PackageUnit;
import com.freight.vehicle.entity.BodyType;
import com.freight.vehicle.entity.VehicleType;
import java.time.LocalDateTime;

/**
 * 차주가 수락 전에 보는 의뢰 상세 응답.
 * 로드맵 matching: 주소는 시·구(region)만 담고, 상세주소·연락처·좌표는 일부러 넣지 않는다.
 * 수락해서 배차된 뒤에야 화주의 정확한 위치와 연락처를 볼 수 있다.
 */
public record OpenOrderDetailResponse(
        Long id,
        long version,
        String pickupRegion,
        String dropoffRegion,
        LocalDateTime pickupAt,
        LocalDateTime arriveBy,
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
        VehicleType requiredVehicleType,
        BodyType bodyType,
        LoadingMethod loadingMethod,
        String memo,
        long fare,
        long recommendedFare,
        double distanceKm) {

    /** 오더에서 수락 전에 공개해도 되는 값만 골라 상세 응답을 만든다. */
    public static OpenOrderDetailResponse from(Order order) {
        Cargo cargo = order.getCargo();
        return new OpenOrderDetailResponse(
                order.getId(),
                order.getVersion(),
                order.getPickup().getRegion(),
                order.getDropoff().getRegion(),
                order.getPickupAt(),
                order.getArriveBy(),
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
                order.getRequiredVehicleType(),
                order.getBodyType(),
                order.getLoadingMethod(),
                order.getMemo(),
                order.getFare(),
                order.getRecommendedFare(),
                order.getDistanceKm());
    }
}

package com.freight.order;

import com.freight.order.dto.SaveOrderRequest;
import com.freight.order.entity.LoadingMethod;
import com.freight.order.entity.Location;
import com.freight.support.Fixtures;
import com.freight.vehicle.entity.BodyType;
import com.freight.vehicle.entity.VehicleType;
import java.time.LocalDateTime;

/** 기존 Fixtures를 API 입력으로 바꿔 오더 테스트의 공통 데이터를 만든다. */
public final class OrderRequests {
    private OrderRequests() {}

    public static SaveOrderRequest valid(long fare) {
        var cargo = Fixtures.cargo(1200);
        LocalDateTime pickup = LocalDateTime.now().plusDays(2).withNano(0);
        return new SaveOrderRequest(
                location(Fixtures.pickupLocation()),
                location(Fixtures.dropoffLocation()),
                pickup,
                pickup.plusHours(6),
                new SaveOrderRequest.CargoRequest(
                        cargo.getItemName(),
                        cargo.getCargoType(),
                        cargo.getWeightKg(),
                        cargo.getQuantity(),
                        cargo.getPackageUnit(),
                        cargo.getWidthCm(),
                        cargo.getDepthCm(),
                        cargo.getHeightCm(),
                        cargo.isFragile(),
                        cargo.isNoStack()),
                VehicleType.TON_2_5,
                BodyType.CARGO,
                LoadingMethod.FORKLIFT,
                "도착 전 연락",
                fare,
                340000L,
                390.5);
    }

    private static SaveOrderRequest.LocationRequest location(Location location) {
        return new SaveOrderRequest.LocationRequest(
                location.getAddress(),
                location.getDetailAddress(),
                location.getRegion(),
                location.getLatitude(),
                location.getLongitude(),
                location.getContactName(),
                location.getContactPhone());
    }
}

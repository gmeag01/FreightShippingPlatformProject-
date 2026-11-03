package com.freight.matching.dto;

import com.freight.order.entity.CargoType;
import com.freight.order.entity.LoadingMethod;
import com.freight.order.entity.Order;
import com.freight.vehicle.entity.BodyType;
import com.freight.vehicle.entity.VehicleType;
import java.time.LocalDateTime;

public record OpenOrderResponse(
        Long id,
        long version,
        String pickupRegion,
        String dropoffRegion,
        LocalDateTime pickupAt,
        LocalDateTime arriveBy,
        String itemName,
        CargoType cargoType,
        int weightKg,
        VehicleType requiredVehicleType,
        BodyType bodyType,
        LoadingMethod loadingMethod,
        long fare,
        double distanceKm) {

    public static OpenOrderResponse from(Order order) {
        return new OpenOrderResponse(
                order.getId(),
                order.getVersion(),
                order.getPickup().getRegion(),
                order.getDropoff().getRegion(),
                order.getPickupAt(),
                order.getArriveBy(),
                order.getCargo().getItemName(),
                order.getCargo().getCargoType(),
                order.getCargo().getWeightKg(),
                order.getRequiredVehicleType(),
                order.getBodyType(),
                order.getLoadingMethod(),
                order.getFare(),
                order.getDistanceKm());
    }
}

package com.freight.vehicle.dto;

import com.freight.vehicle.entity.BodyType;
import com.freight.vehicle.entity.Vehicle;
import com.freight.vehicle.entity.VehicleType;

public record VehicleResponse(
        Long id,
        Long driverId,
        VehicleType vehicleType,
        String vehicleTypeName,
        int maxLoadKg,
        String plateNumber,
        BodyType bodyType) {

    public static VehicleResponse from(Vehicle vehicle) {
        return new VehicleResponse(
                vehicle.getId(),
                vehicle.getDriver().getId(),
                vehicle.getVehicleType(),
                vehicle.getVehicleType().getLabel(),
                vehicle.getVehicleType().getMaxLoadKg(),
                vehicle.getPlateNumber(),
                vehicle.getBodyType());
    }
}

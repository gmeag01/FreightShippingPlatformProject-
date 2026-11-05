package com.freight.fare.dto;

import com.freight.fare.entity.FareRate;
import com.freight.vehicle.entity.VehicleType;

/** 차종별 단가표 응답 DTO. 최대 적재량은 차종 enum에 고정된 값이다. */
public record FareRateResponse(
        VehicleType vehicleType, String vehicleTypeName, int maxLoadKg, long baseFare, long perKmFare) {

    public static FareRateResponse from(FareRate fareRate) {
        VehicleType type = fareRate.getVehicleType();
        return new FareRateResponse(
                type, type.getLabel(), type.getMaxLoadKg(), fareRate.getBaseFare(), fareRate.getPerKmFare());
    }
}

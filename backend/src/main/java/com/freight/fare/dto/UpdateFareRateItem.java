package com.freight.fare.dto;

import com.freight.vehicle.entity.VehicleType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** 개별 차종 단가 수정 항목 DTO. */
public record UpdateFareRateItem(
        @NotNull(message = "차종을 지정해 주세요") VehicleType vehicleType,
        @Min(value = 0, message = "기본요금은 0원 이상이어야 합니다") long baseFare,
        @Min(value = 0, message = "km당 단가는 0원 이상이어야 합니다") long perKmFare) {}

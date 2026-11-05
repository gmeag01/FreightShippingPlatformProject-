package com.freight.fare.dto;

import com.freight.order.entity.LoadingMethod;
import com.freight.vehicle.entity.VehicleType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDateTime;

/** 추천 운임 계산 API 요청 DTO. */
public record EstimateFareRequest(
        @NotNull(message = "상차지 위도를 입력해 주세요") @DecimalMin("-90.0") @DecimalMax("90.0") Double pickupLat,
        @NotNull(message = "상차지 경도를 입력해 주세요") @DecimalMin("-180.0") @DecimalMax("180.0") Double pickupLng,
        @NotNull(message = "하차지 위도를 입력해 주세요") @DecimalMin("-90.0") @DecimalMax("90.0") Double dropoffLat,
        @NotNull(message = "하차지 경도를 입력해 주세요") @DecimalMin("-180.0") @DecimalMax("180.0") Double dropoffLng,
        @Positive(message = "화물 중량은 1kg 이상이어야 합니다") int weightKg,
        VehicleType vehicleType,
        LocalDateTime pickupAt,
        LoadingMethod loadingMethod,
        LocalDateTime requestedAt) {

    public FareEstimateCommand toCommand() {
        return new FareEstimateCommand(
                pickupLat,
                pickupLng,
                dropoffLat,
                dropoffLng,
                weightKg,
                vehicleType,
                pickupAt,
                loadingMethod,
                requestedAt);
    }
}

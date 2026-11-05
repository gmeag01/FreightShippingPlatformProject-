package com.freight.order.dto;

import com.freight.order.entity.*;
import com.freight.vehicle.entity.BodyType;
import com.freight.vehicle.entity.VehicleType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;

/** 화주가 입력하는 오더 정보. 회원 ID와 상태는 입력받지 않는다. */
public record SaveOrderRequest(
        @NotNull @Valid LocationRequest pickup,
        @NotNull @Valid LocationRequest dropoff,
        @NotNull LocalDateTime pickupAt,
        @NotNull LocalDateTime arriveBy,
        @NotNull @Valid CargoRequest cargo,
        @NotNull VehicleType requiredVehicleType,
        BodyType bodyType,
        @NotNull LoadingMethod loadingMethod,
        @Size(max = 255) String memo,
        @Positive long fare,
        @PositiveOrZero long recommendedFare,
        @PositiveOrZero double distanceKm) {

    /** 도착 희망 시각은 상차 이후이고 거리는 유한한 수여야 한다. */
    @AssertTrue(message = "도착 시각은 상차 이후이며 거리는 유효한 숫자여야 합니다")
    public boolean isScheduleValid() {
        return Double.isFinite(distanceKm) && (pickupAt == null || arriveBy == null || arriveBy.isAfter(pickupAt));
    }

    /** API 입력을 엔티티 생성용 값 객체로 바꾼다. */
    public OrderSpec toSpec() {
        return new OrderSpec(
                pickup.toEntity(),
                dropoff.toEntity(),
                pickupAt,
                arriveBy,
                cargo.toEntity(),
                requiredVehicleType,
                bodyType,
                loadingMethod,
                memo,
                fare,
                recommendedFare,
                distanceKm);
    }

    /** 상하차 장소와 현장 연락처를 검증한다. */
    public record LocationRequest(
            @NotBlank @Size(max = 255) String address,
            @NotBlank @Size(max = 255) String detailAddress,
            @NotBlank @Size(max = 255) String region,
            @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude,
            @NotBlank @Size(max = 50) String contactName,
            @NotBlank @Size(max = 20) String contactPhone) {
        public Location toEntity() {
            return Location.builder()
                    .address(address)
                    .detailAddress(detailAddress)
                    .region(region)
                    .latitude(latitude)
                    .longitude(longitude)
                    .contactName(contactName)
                    .contactPhone(contactPhone)
                    .build();
        }
    }

    /** 중량은 차량 선택과 별도로 검증한다. 차종 불일치 정책은 matching 도메인이 담당한다. */
    public record CargoRequest(
            @NotBlank @Size(max = 255) String itemName,
            @NotNull CargoType cargoType,
            @Positive int weightKg,
            @Positive int quantity,
            @NotNull PackageUnit packageUnit,
            @Positive Integer widthCm,
            @Positive Integer depthCm,
            @Positive Integer heightCm,
            boolean fragile,
            boolean noStack) {
        public Cargo toEntity() {
            return Cargo.builder()
                    .itemName(itemName)
                    .cargoType(cargoType)
                    .weightKg(weightKg)
                    .quantity(quantity)
                    .packageUnit(packageUnit)
                    .widthCm(widthCm)
                    .depthCm(depthCm)
                    .heightCm(heightCm)
                    .fragile(fragile)
                    .noStack(noStack)
                    .build();
        }
    }
}

package com.freight.vehicle.dto;

import com.freight.vehicle.entity.BodyType;
import com.freight.vehicle.entity.VehicleType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record VehicleRequest(
        @NotNull(message = "차종을 선택해 주세요") VehicleType vehicleType,
        @NotBlank(message = "차량번호를 입력해 주세요") String plateNumber,
        @NotNull(message = "적재함 형태를 선택해 주세요") BodyType bodyType) {}

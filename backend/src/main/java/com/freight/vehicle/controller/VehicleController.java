package com.freight.vehicle.controller;

import com.freight.global.common.ApiResponse;
import com.freight.global.security.AuthMember;
import com.freight.vehicle.dto.VehicleRequest;
import com.freight.vehicle.dto.VehicleResponse;
import com.freight.vehicle.service.VehicleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 차주 본인의 차량 등록, 수정 및 조회 컨트롤러. */
@Tag(name = "Vehicle", description = "차주 차량 API")
@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
@PreAuthorize("hasRole('DRIVER')")
public class VehicleController {

    private final VehicleService vehicleService;

    @Operation(summary = "내 차량 정보 조회", description = "로그인한 차주 본인의 등록된 차량 정보를 조회합니다.")
    @GetMapping("/me")
    public ApiResponse<VehicleResponse> getMyVehicle(@AuthenticationPrincipal AuthMember me) {
        return ApiResponse.ok(vehicleService.getMyVehicle(me.id()));
    }

    @Operation(summary = "내 차량 등록", description = "로그인한 차주의 차량을 등록합니다. 이미 등록된 경우 정보가 갱신됩니다.")
    @PostMapping("/me")
    public ApiResponse<VehicleResponse> registerVehicle(
            @AuthenticationPrincipal AuthMember me, @Valid @RequestBody VehicleRequest request) {
        return ApiResponse.ok(vehicleService.registerOrUpdate(me.id(), request));
    }

    @Operation(summary = "내 차량 수정", description = "로그인한 차주의 차량 정보를 수정합니다.")
    @PutMapping("/me")
    public ApiResponse<VehicleResponse> updateVehicle(
            @AuthenticationPrincipal AuthMember me, @Valid @RequestBody VehicleRequest request) {
        return ApiResponse.ok(vehicleService.registerOrUpdate(me.id(), request));
    }
}

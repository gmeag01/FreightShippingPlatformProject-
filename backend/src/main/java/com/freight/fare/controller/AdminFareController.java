package com.freight.fare.controller;

import com.freight.fare.dto.FareRateResponse;
import com.freight.fare.dto.FareSurchargeResponse;
import com.freight.fare.dto.FareTableResponse;
import com.freight.fare.dto.UpdateFareRatesRequest;
import com.freight.fare.dto.UpdateFareSurchargesRequest;
import com.freight.fare.service.FareService;
import com.freight.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 관리자 전용 단가표 및 할증률 관리 API 컨트롤러. */
@Tag(name = "관리자 단가표 API", description = "관리자 전용 차종별 단가표 및 할증률 조회·수정 API")
@RestController
@RequestMapping("/api/admin/fares")
@RequiredArgsConstructor
@SecurityRequirement(name = "BearerAuth")
public class AdminFareController {

    private final FareService fareService;

    /** 차종별 단가표와 할증률 전체 목록을 조회한다. */
    @Operation(summary = "단가표 및 할증률 전체 조회", description = "차종별 기본요금·km당 단가와 할증률 전체를 조회합니다.")
    @GetMapping
    public ApiResponse<FareTableResponse> getFareTable() {
        return ApiResponse.ok(fareService.getFareTable());
    }

    /** 차종별 기본요금과 km당 단가를 일괄 수정한다. */
    @Operation(summary = "차종별 단가표 수정", description = "차종별 기본요금과 km당 단가를 수정합니다. 최대 적재량은 고정값입니다.")
    @PutMapping("/rates")
    public ApiResponse<List<FareRateResponse>> updateFareRates(@Valid @RequestBody UpdateFareRatesRequest request) {
        return ApiResponse.ok(fareService.updateFareRates(request.rates()));
    }

    /** 할증률을 일괄 수정한다. */
    @Operation(summary = "할증률 수정", description = "야간, 주말, 수작업, 긴급 할증률을 수정합니다.")
    @PutMapping("/surcharges")
    public ApiResponse<List<FareSurchargeResponse>> updateFareSurcharges(
            @Valid @RequestBody UpdateFareSurchargesRequest request) {
        return ApiResponse.ok(fareService.updateFareSurcharges(request.surcharges()));
    }
}

package com.freight.fare.controller;

import com.freight.fare.dto.Coordinates;
import com.freight.fare.dto.EstimateFareRequest;
import com.freight.fare.dto.FareEstimate;
import com.freight.fare.service.FareService;
import com.freight.fare.service.GeocodingService;
import com.freight.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 추천 운임 계산 및 주소 좌표 변환 API 컨트롤러. */
@Tag(name = "운임 API", description = "추천 운임 견적 계산 및 주소 지오코딩 API")
@RestController
@RequestMapping("/api/fares")
@RequiredArgsConstructor
@SecurityRequirement(name = "BearerAuth")
public class FareController {

    private final FareService fareService;
    private final GeocodingService geocodingService;

    /** 출발지·도착지 좌표, 중량, 상차 조건을 바탕으로 추천 차종과 추천 운임을 계산한다. */
    @Operation(summary = "추천 운임 계산", description = "출발지·도착지 좌표, 중량, 차종(선택), 할증 조건을 받아 거리와 추천 운임 내역을 반환합니다.")
    @PostMapping("/estimate")
    public ApiResponse<FareEstimate> estimateFare(@Valid @RequestBody EstimateFareRequest request) {
        return ApiResponse.ok(fareService.estimate(request.toCommand()));
    }

    /** 주소를 위도·경도 좌표로 변환한다. */
    @Operation(summary = "주소 좌표 변환", description = "도로명 또는 지번 주소를 위도·경도 좌표로 변환합니다.")
    @GetMapping("/geocode")
    public ApiResponse<Coordinates> geocode(@RequestParam String address) {
        return ApiResponse.ok(geocodingService.geocode(address));
    }
}

package com.freight.order.controller;

import com.freight.global.common.ApiResponse;
import com.freight.global.security.AuthMember;
import com.freight.order.dto.*;
import com.freight.order.entity.OrderStatus;
import com.freight.order.service.OrderManagementService;
import com.freight.vehicle.entity.VehicleType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** 관리자가 전체 오더를 검색하고 등록·배차 완료 상태의 오더를 취소한다. */
@Tag(name = "관리자 오더 API", description = "관리자 전용 전체 오더 검색, 상세 조회, 취소 API")
@RestController
@RequestMapping("/api/admin/orders")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminOrderController {
    private final OrderManagementService service;

    /** 상차 희망일 기준으로 상태·기간·차종 필터를 적용한다. */
    @Operation(
            summary = "전체 오더 검색",
            description = "상태, 차종, 상차 희망일 기간(from~to, 양 끝 포함)으로 전체 오더를 검색합니다. 필터를 생략하면 전체를 조회합니다.")
    @GetMapping
    public ApiResponse<Page<OrderSummaryResponse>> list(
            @AuthenticationPrincipal AuthMember me,
            @RequestParam(name = "status", required = false) OrderStatus status,
            @RequestParam(name = "vehicleType", required = false) VehicleType vehicleType,
            @RequestParam(name = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate from,
            @RequestParam(name = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(name = "page", defaultValue = "0") int page) {
        return ApiResponse.ok(service.listAdmin(me.id(), status, vehicleType, from, to, page));
    }
    /** 관리자는 전체 상세 정보와 상태 이력을 확인한다. */
    @Operation(summary = "오더 상세 조회", description = "오더의 전체 상세 정보와 상태 이력을 조회합니다.")
    @GetMapping("/{id}")
    public ApiResponse<OrderDetailResponse> detail(
            @PathVariable("id") Long id, @AuthenticationPrincipal AuthMember me) {
        return ApiResponse.ok(service.getDetail(id, me.id()));
    }
    /** 배차 후 취소는 관리자가 사유를 남기고 처리한다. */
    @Operation(
            summary = "오더 취소",
            description = "등록(REGISTERED) 또는 배차 완료(ASSIGNED) 상태의 오더를 사유와 함께 취소하고 환불합니다. 조회 시점의 version이 필요합니다.")
    @PostMapping("/{id}/cancel")
    public ApiResponse<OrderDetailResponse> cancel(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal AuthMember me,
            @Valid @RequestBody CancelOrderRequest request) {
        return ApiResponse.ok(service.cancel(id, me.id(), request));
    }
}

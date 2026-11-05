package com.freight.order.controller;

import com.freight.global.common.ApiResponse;
import com.freight.global.security.AuthMember;
import com.freight.order.dto.*;
import com.freight.order.entity.OrderStatus;
import com.freight.order.service.OrderManagementService;
import com.freight.vehicle.entity.VehicleType;
import jakarta.validation.Valid;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** 관리자가 전체 오더를 검색하고 등록·배차 완료 상태의 오더를 취소한다. */
@RestController
@RequestMapping("/api/admin/orders")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminOrderController {
    private final OrderManagementService service;

    /** 상차 희망일 기준으로 상태·기간·차종 필터를 적용한다. */
    @GetMapping
    public ApiResponse<Page<OrderSummaryResponse>> list(
            @AuthenticationPrincipal AuthMember me,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) VehicleType vehicleType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page) {
        return ApiResponse.ok(service.listAdmin(me.id(), status, vehicleType, from, to, page));
    }
    /** 관리자는 전체 상세 정보와 상태 이력을 확인한다. */
    @GetMapping("/{id}")
    public ApiResponse<OrderDetailResponse> detail(@PathVariable Long id, @AuthenticationPrincipal AuthMember me) {
        return ApiResponse.ok(service.getDetail(id, me.id()));
    }
    /** 배차 후 취소는 관리자가 사유를 남기고 처리한다. */
    @PostMapping("/{id}/cancel")
    public ApiResponse<OrderDetailResponse> cancel(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthMember me,
            @Valid @RequestBody CancelOrderRequest request) {
        return ApiResponse.ok(service.cancel(id, me.id(), request));
    }
}

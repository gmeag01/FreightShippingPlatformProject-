package com.freight.order.controller;

import com.freight.global.common.ApiResponse;
import com.freight.global.security.AuthMember;
import com.freight.order.dto.*;
import com.freight.order.entity.OrderStatus;
import com.freight.order.service.OrderManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** 화주의 오더 등록·조회·수정·취소 API. 기사 수락 API와 같은 자원 주소를 사용한다. */
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Tag(name = "오더 관리", description = "화주의 오더 등록, 조회, 수정, 취소 API")
@SecurityRequirement(name = "BearerAuth")
public class OrderController {
    private final OrderManagementService service;

    /** 로그인한 화주 명의로 오더를 등록한다. */
    @Operation(summary = "오더 등록", description = "로그인한 화주 명의로 오더를 등록하고 운임을 결제 보관(HELD)합니다. 상차 희망 시각은 현재 이후여야 합니다.")
    @PostMapping
    @PreAuthorize("hasRole('SHIPPER')")
    public ApiResponse<OrderDetailResponse> create(
            @AuthenticationPrincipal AuthMember me, @Valid @RequestBody SaveOrderRequest request) {
        return ApiResponse.ok(service.create(me.id(), request));
    }
    /** 본인 오더 목록을 상태별로 조회한다. */
    @Operation(
            summary = "내 오더 목록 조회",
            description = "화주 본인의 오더를 최근 등록순으로 조회합니다. status를 생략하면 전체 상태를 조회하고, page는 0부터 시작합니다.")
    @GetMapping
    @PreAuthorize("hasRole('SHIPPER')")
    public ApiResponse<Page<OrderSummaryResponse>> list(
            @AuthenticationPrincipal AuthMember me,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(defaultValue = "0") int page) {
        return ApiResponse.ok(service.listMine(me.id(), status, page));
    }
    /** 상세 주소와 연락처는 소유·배정 관계에 따라 가린다. */
    @Operation(
            summary = "오더 상세 조회",
            description = "화주 본인, 배정된 차주, 관리자는 전체 정보를 조회합니다. 배차 전 오더를 조회하는 차주에게는 상세주소와 연락처를 가립니다.")
    @GetMapping("/{id}")
    public ApiResponse<OrderDetailResponse> detail(@PathVariable Long id, @AuthenticationPrincipal AuthMember me) {
        return ApiResponse.ok(service.getDetail(id, me.id()));
    }
    /** 배차 전 본인 오더만 수정한다. */
    @Operation(
            summary = "오더 수정",
            description = "배차 전(REGISTERED) 본인 오더를 수정합니다. 조회 시점의 version이 필요하며, 운임이 바뀌면 결제 차액을 처리합니다.")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SHIPPER')")
    public ApiResponse<OrderDetailResponse> update(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthMember me,
            @Valid @RequestBody UpdateOrderRequest request) {
        return ApiResponse.ok(service.update(id, me.id(), request));
    }
    /** 배차 전 본인 요청을 취소하고 환불한다. */
    @Operation(
            summary = "오더 취소",
            description = "배차 전(REGISTERED) 본인 오더를 사유와 함께 취소하고 결제 금액을 환불합니다. 조회 시점의 version이 필요합니다.")
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasRole('SHIPPER')")
    public ApiResponse<OrderDetailResponse> cancel(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthMember me,
            @Valid @RequestBody CancelOrderRequest request) {
        return ApiResponse.ok(service.cancel(id, me.id(), request));
    }
}

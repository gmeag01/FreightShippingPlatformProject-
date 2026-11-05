package com.freight.order.controller;

import com.freight.global.common.ApiResponse;
import com.freight.global.security.AuthMember;
import com.freight.order.dto.*;
import com.freight.order.entity.OrderStatus;
import com.freight.order.service.OrderManagementService;
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
@Tag(name = "오더 관리")
@SecurityRequirement(name = "BearerAuth")
public class OrderController {
    private final OrderManagementService service;

    /** 로그인한 화주 명의로 오더를 등록한다. */
    @PostMapping
    @PreAuthorize("hasRole('SHIPPER')")
    public ApiResponse<OrderDetailResponse> create(
            @AuthenticationPrincipal AuthMember me, @Valid @RequestBody SaveOrderRequest request) {
        return ApiResponse.ok(service.create(me.id(), request));
    }
    /** 본인 오더 목록을 상태별로 조회한다. */
    @GetMapping
    @PreAuthorize("hasRole('SHIPPER')")
    public ApiResponse<Page<OrderSummaryResponse>> list(
            @AuthenticationPrincipal AuthMember me,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(defaultValue = "0") int page) {
        return ApiResponse.ok(service.listMine(me.id(), status, page));
    }
    /** 상세 주소와 연락처는 소유·배정 관계에 따라 가린다. */
    @GetMapping("/{id}")
    public ApiResponse<OrderDetailResponse> detail(@PathVariable Long id, @AuthenticationPrincipal AuthMember me) {
        return ApiResponse.ok(service.getDetail(id, me.id()));
    }
    /** 배차 전 본인 오더만 수정한다. */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SHIPPER')")
    public ApiResponse<OrderDetailResponse> update(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthMember me,
            @Valid @RequestBody UpdateOrderRequest request) {
        return ApiResponse.ok(service.update(id, me.id(), request));
    }
    /** 배차 전 본인 요청을 취소하고 환불한다. */
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasRole('SHIPPER')")
    public ApiResponse<OrderDetailResponse> cancel(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthMember me,
            @Valid @RequestBody CancelOrderRequest request) {
        return ApiResponse.ok(service.cancel(id, me.id(), request));
    }
}

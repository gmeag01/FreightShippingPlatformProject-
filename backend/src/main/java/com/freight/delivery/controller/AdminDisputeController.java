package com.freight.delivery.controller;

import com.freight.delivery.dto.DeliveryStatusResponse;
import com.freight.delivery.dto.DisputeDetailResponse;
import com.freight.delivery.dto.DisputeSummaryResponse;
import com.freight.delivery.dto.ResolveDisputeRequest;
import com.freight.delivery.service.DeliveryService;
import com.freight.delivery.service.DisputeQueryService;
import com.freight.global.common.ApiResponse;
import com.freight.global.security.AuthMember;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 관리자의 분쟁 조회와 처리를 받는 컨트롤러. /api/admin/** 권한은 SecurityConfig가 검사한다.
 */
@RestController
@RequestMapping("/api/admin/disputes")
@RequiredArgsConstructor
public class AdminDisputeController {

    private final DeliveryService deliveryService;
    private final DisputeQueryService disputeQueryService;

    /**
     * 처리 대기 중인 분쟁 목록을 조회한다.
     */
    @GetMapping
    public ApiResponse<Page<DisputeSummaryResponse>> listDisputes(@RequestParam(defaultValue = "0") int page) {
        return ApiResponse.ok(disputeQueryService.listDisputes(page));
    }

    /**
     * 분쟁 상세를 조회한다.
     */
    @GetMapping("/{orderId}")
    public ApiResponse<DisputeDetailResponse> getDispute(@PathVariable Long orderId) {
        return ApiResponse.ok(disputeQueryService.getDispute(orderId));
    }

    /**
     * 관리자가 분쟁을 차주 지급 또는 화주 환불로 처리한다.
     */
    @PostMapping("/{orderId}/resolve")
    public ApiResponse<DeliveryStatusResponse> resolve(
            @PathVariable Long orderId,
            @AuthenticationPrincipal AuthMember me,
            @Valid @RequestBody ResolveDisputeRequest request) {
        return ApiResponse.ok(deliveryService.resolveDispute(orderId, me.id(), request));
    }
}

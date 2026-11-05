package com.freight.delivery.controller;

import com.freight.delivery.dto.DeliveryStatusResponse;
import com.freight.delivery.dto.ResolveDisputeRequest;
import com.freight.delivery.service.DeliveryService;
import com.freight.global.common.ApiResponse;
import com.freight.global.security.AuthMember;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 관리자의 분쟁 처리를 받는 컨트롤러. /api/admin/** 권한은 SecurityConfig가 검사한다.
 */
@RestController
@RequestMapping("/api/admin/disputes")
@RequiredArgsConstructor
public class AdminDisputeController {

    private final DeliveryService deliveryService;

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

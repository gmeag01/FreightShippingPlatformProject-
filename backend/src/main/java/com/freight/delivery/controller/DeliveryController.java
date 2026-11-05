package com.freight.delivery.controller;

import com.freight.delivery.dto.DeliveryStatusResponse;
import com.freight.delivery.dto.ReportIssueRequest;
import com.freight.delivery.service.DeliveryService;
import com.freight.global.common.ApiResponse;
import com.freight.global.security.AuthMember;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 차주의 상차·하차와 화주의 수령 확인·문제 신고를 받는 컨트롤러.
 */
@Tag(name = "운송 진행 API", description = "차주의 상차·하차 처리와 화주의 수령 확인·문제 신고 API")
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class DeliveryController {

    private final DeliveryService deliveryService;

    /**
     * 배정된 차주가 상차 완료를 알린다.
     */
    @Operation(summary = "상차 완료", description = "배정된 차주가 상차 완료를 알립니다. 오더가 ASSIGNED에서 운송 중(IN_TRANSIT)으로 바뀝니다.")
    @PostMapping("/{id}/pickup")
    @PreAuthorize("hasRole('DRIVER')")
    public ApiResponse<DeliveryStatusResponse> pickup(@PathVariable Long id, @AuthenticationPrincipal AuthMember me) {
        return ApiResponse.ok(deliveryService.pickup(id, me.id()));
    }

    /**
     * 배정된 차주가 하차 완료를 알린다.
     */
    @Operation(
            summary = "하차 완료",
            description = "배정된 차주가 하차 완료를 알립니다. 오더가 IN_TRANSIT에서 수령 확인 대기(AWAITING_CONFIRM)로 바뀝니다.")
    @PostMapping("/{id}/dropoff")
    @PreAuthorize("hasRole('DRIVER')")
    public ApiResponse<DeliveryStatusResponse> dropoff(@PathVariable Long id, @AuthenticationPrincipal AuthMember me) {
        return ApiResponse.ok(deliveryService.dropoff(id, me.id()));
    }

    /**
     * 화주가 수령을 확인한다. 운임이 차주에게 지급된다.
     */
    @Operation(summary = "수령 확인", description = "화주가 수령을 확인해 운송을 완료(COMPLETED)하고 운임을 차주에게 지급합니다.")
    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasRole('SHIPPER')")
    public ApiResponse<DeliveryStatusResponse> confirm(@PathVariable Long id, @AuthenticationPrincipal AuthMember me) {
        return ApiResponse.ok(deliveryService.confirm(id, me.id()));
    }

    /**
     * 화주가 수령 확인 대신 문제를 신고한다.
     */
    @Operation(summary = "문제 신고", description = "화주가 수령 확인 대신 문제를 신고합니다. 오더가 분쟁(DISPUTED) 상태로 바뀝니다.")
    @PostMapping("/{id}/report")
    @PreAuthorize("hasRole('SHIPPER')")
    public ApiResponse<DeliveryStatusResponse> report(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthMember me,
            @Valid @RequestBody ReportIssueRequest request) {
        return ApiResponse.ok(deliveryService.report(id, me.id(), request));
    }
}

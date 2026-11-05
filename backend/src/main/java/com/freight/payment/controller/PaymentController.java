package com.freight.payment.controller;

import com.freight.global.common.ApiResponse;
import com.freight.global.security.AuthMember;
import com.freight.payment.dto.PaymentDetailResponse;
import com.freight.payment.dto.PayoutResponse;
import com.freight.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 결제와 지급 내역을 조회하는 컨트롤러.
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    /**
     * 화주 본인이나 관리자가 오더의 결제 상태와 건별 내역을 조회한다.
     */
    @GetMapping("/orders/{id}/payment")
    @PreAuthorize("hasAnyRole('SHIPPER', 'ADMIN')")
    public ApiResponse<PaymentDetailResponse> getPayment(
            @PathVariable Long id, @AuthenticationPrincipal AuthMember me) {
        return ApiResponse.ok(paymentService.getPaymentDetail(id, me.id(), me.role()));
    }

    /**
     * 차주가 자기 지급 내역을 최신순으로 조회한다.
     */
    @GetMapping("/payouts")
    @PreAuthorize("hasRole('DRIVER')")
    public ApiResponse<Page<PayoutResponse>> listPayouts(
            @AuthenticationPrincipal AuthMember me, @RequestParam(defaultValue = "0") int page) {
        return ApiResponse.ok(paymentService.listPayouts(me.id(), page));
    }
}

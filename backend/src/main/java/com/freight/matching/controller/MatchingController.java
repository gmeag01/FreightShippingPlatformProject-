package com.freight.matching.controller;

import com.freight.global.common.ApiResponse;
import com.freight.global.security.AuthMember;
import com.freight.matching.dto.AcceptOrderRequest;
import com.freight.matching.dto.AcceptOrderResponse;
import com.freight.matching.dto.CancelAssignmentRequest;
import com.freight.matching.dto.OpenOrderDetailResponse;
import com.freight.matching.dto.OpenOrderResponse;
import com.freight.matching.service.MatchingService;
import com.freight.vehicle.entity.VehicleType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 차주(DRIVER)가 열린 의뢰 목록을 조회하고 오더를 수락하거나 배차를 취소하는 컨트롤러.
 */
@Tag(name = "배차 API", description = "차주의 열린 의뢰 조회, 오더 수락, 배차 취소 API")
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class MatchingController {

    private final MatchingService matchingService;

    /**
     * 배차 전(REGISTERED) 상태의 열린 의뢰 목록을 차종 필터와 페이지 번호로 조회한다.
     */
    @Operation(summary = "열린 의뢰 목록 조회", description = "배차 전(REGISTERED) 오더를 차종 필터와 페이지 번호로 조회합니다.")
    @GetMapping("/open")
    @PreAuthorize("hasRole('DRIVER')")
    public ApiResponse<Page<OpenOrderResponse>> listOpenOrders(
            @RequestParam(required = false) VehicleType vehicleType, @RequestParam(defaultValue = "0") int page) {
        return ApiResponse.ok(matchingService.listOpenOrders(vehicleType, page));
    }

    /**
     * 수락 전 의뢰 상세를 조회한다. 주소는 시·구까지만, 상세주소·연락처·좌표는 보내지 않는다.
     */
    @Operation(summary = "열린 의뢰 상세 조회", description = "수락 전 의뢰 상세를 조회합니다. 주소는 시·구까지만 보여 주고 상세주소, 연락처, 좌표는 보내지 않습니다.")
    @GetMapping("/open/{id}")
    @PreAuthorize("hasRole('DRIVER')")
    public ApiResponse<OpenOrderDetailResponse> getOpenOrderDetail(@PathVariable Long id) {
        return ApiResponse.ok(matchingService.getOpenOrderDetail(id));
    }

    /**
     * 차주가 오더를 수락하여 배차(ASSIGNED)받는다.
     */
    @Operation(
            summary = "오더 수락",
            description =
                    "차주가 오더를 수락해 배차(ASSIGNED)받습니다. 조회 시점의 version이 필요하고, 차종·중량이 맞지 않으면 confirmMismatch로 확인해야 합니다. 동시에 수락하면 한 명만 성공합니다.")
    @PostMapping("/{id}/accept")
    @PreAuthorize("hasRole('DRIVER')")
    public ApiResponse<AcceptOrderResponse> acceptOrder(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthMember me,
            @Valid @RequestBody AcceptOrderRequest request) {
        return ApiResponse.ok(matchingService.acceptOrder(id, me.id(), request));
    }

    /**
     * 배정된 차주가 상차 희망 시각 2시간 전까지 사유를 입력해 배차를 취소한다.
     */
    @Operation(
            summary = "배차 취소",
            description = "배정된 차주가 사유를 입력해 배차를 취소합니다. 상차 희망 시각 2시간 전까지만 가능하며, 오더는 다시 등록(REGISTERED) 상태가 됩니다.")
    @PostMapping("/{id}/cancel-assignment")
    @PreAuthorize("hasRole('DRIVER')")
    public ApiResponse<Void> cancelAssignment(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthMember me,
            @Valid @RequestBody CancelAssignmentRequest request) {
        matchingService.cancelAssignment(id, me.id(), request);
        return ApiResponse.ok(null);
    }
}

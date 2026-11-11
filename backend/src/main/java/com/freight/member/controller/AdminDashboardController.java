package com.freight.member.controller;

import com.freight.global.common.ApiResponse;
import com.freight.member.dto.AdminDashboardOrderDto;
import com.freight.member.dto.AdminDashboardResponse;
import com.freight.member.service.AdminDashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 관리자 대시보드 통계 API 컨트롤러.
 */
@Tag(name = "관리자 대시보드 API", description = "오늘의 운송 지표, 미배차/분쟁 건수 및 긴급 오더 조회 API")
@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
@SecurityRequirement(name = "BearerAuth")
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    /**
     * 관리자 대시보드 요약 통계 및 긴급 조치 목록을 조회한다.
     *
     * @return 대시보드 통계 DTO
     */
    @Operation(summary = "관리자 대시보드 조회", description = "오늘/어제 등록·배차·완료 건수, 미배차 건수, 처리할 분쟁 수, 상차 임박 목록을 조회합니다.")
    @GetMapping
    public ApiResponse<AdminDashboardResponse> getDashboard() {
        AdminDashboardResponse response = adminDashboardService.getDashboard();
        return ApiResponse.ok(response);
    }

    /**
     * 대시보드 통계 카드 클릭 시 상세 오더 목록을 조회한다.
     *
     * @param type 통계 유형 (TODAY_REGISTERED, TODAY_ASSIGNED, TODAY_COMPLETED, URGENT_UNASSIGNED)
     * @return 해당 통계 대상 오더 목록
     */
    @Operation(summary = "대시보드 통계 대상 오더 목록 조회", description = "오늘 등록, 오늘 배차, 오늘 완료, 상차 지연 미배차 오더 목록을 조회합니다.")
    @GetMapping("/orders")
    public ApiResponse<List<AdminDashboardOrderDto>> getDashboardOrders(@RequestParam(name = "type") String type) {
        List<AdminDashboardOrderDto> orders = adminDashboardService.getDashboardOrders(type);
        return ApiResponse.ok(orders);
    }
}

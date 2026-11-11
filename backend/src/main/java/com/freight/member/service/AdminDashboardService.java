package com.freight.member.service;

import com.freight.delivery.dto.DisputeSummaryResponse;
import com.freight.delivery.service.DisputeQueryService;
import com.freight.member.dto.AdminDashboardResponse;
import com.freight.member.dto.AdminDashboardResponse.SummaryMetrics;
import com.freight.member.dto.AdminDashboardResponse.UrgentOrderDto;
import com.freight.order.entity.OrderStatus;
import com.freight.order.service.OrderService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 관리자 대시보드 통계 집계 서비스.
 * 오더 도메인의 서비스를 호출하여 오늘/어제 등록·배차·완료 건수, 미배차 건수, 처리할 분쟁 수, 상차 임박 목록을 집계한다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminDashboardService {

    private static final int DASHBOARD_LIST_SIZE = 5;

    private final OrderService orderService;
    private final DisputeQueryService disputeQueryService;

    /**
     * 관리자 대시보드 요약 통계 및 긴급 목록을 조회한다.
     *
     * @return 대시보드 응답 DTO
     */
    public AdminDashboardResponse getDashboard() {
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();
        LocalDateTime todayStart = today.atStartOfDay();
        LocalDateTime todayEnd = today.atTime(LocalTime.MAX);

        LocalDate yesterday = today.minusDays(1);
        LocalDateTime yesterdayStart = yesterday.atStartOfDay();
        LocalDateTime yesterdayEnd = yesterday.atTime(LocalTime.MAX);

        // 1. 오늘/어제 등록 건수
        long todayRegistered = orderService.countOrdersCreatedBetween(todayStart, todayEnd);
        long yesterdayRegistered = orderService.countOrdersCreatedBetween(yesterdayStart, yesterdayEnd);

        // 2. 오늘/어제 배차 건수 (ASSIGNED 전이)
        long todayAssigned = orderService.countStatusTransitions(OrderStatus.ASSIGNED, todayStart, todayEnd);
        long yesterdayAssigned =
                orderService.countStatusTransitions(OrderStatus.ASSIGNED, yesterdayStart, yesterdayEnd);

        // 3. 오늘/어제 완료 건수 (COMPLETED 전이)
        long todayCompleted = orderService.countStatusTransitions(OrderStatus.COMPLETED, todayStart, todayEnd);
        long yesterdayCompleted = orderStatusCompletedYesterday(yesterdayStart, yesterdayEnd);

        // 4. 현재 대기 상태 (미배차, 분쟁)
        long unassignedCount = orderService.countUnassignedOrders(now);
        long disputedCount = orderService.countOrdersByStatus(OrderStatus.DISPUTED);

        SummaryMetrics summary = new SummaryMetrics(
                todayRegistered,
                yesterdayRegistered,
                todayAssigned,
                yesterdayAssigned,
                todayCompleted,
                yesterdayCompleted,
                unassignedCount,
                disputedCount);

        // 5. 상차 임박 미배차 오더 (최대 5건)
        List<UrgentOrderDto> urgentOrders = orderService.findUrgentUnassignedOrders(DASHBOARD_LIST_SIZE).stream()
                .map(order -> UrgentOrderDto.from(order, now))
                .toList();

        // 6. 처리 대기 분쟁 오더 (최대 5건)
        // 설계 시안(admin-dashboard.png)대로 신고 사유·시각을 보여 주려고 분쟁 화면과 같은 delivery 조회를 쓴다.
        List<DisputeSummaryResponse> disputeOrders = disputeQueryService.listDisputes(0).stream()
                .limit(DASHBOARD_LIST_SIZE)
                .toList();

        return new AdminDashboardResponse(summary, urgentOrders, disputeOrders);
    }

    private long orderStatusCompletedYesterday(LocalDateTime start, LocalDateTime end) {
        return orderService.countStatusTransitions(OrderStatus.COMPLETED, start, end);
    }
}

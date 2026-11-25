package com.freight.member.service;

import com.freight.delivery.dto.DisputeSummaryResponse;
import com.freight.delivery.service.DisputeQueryService;
import com.freight.member.dto.AdminDashboardOrderDto;
import com.freight.member.dto.AdminDashboardResponse;
import com.freight.member.dto.AdminDashboardResponse.SummaryMetrics;
import com.freight.member.dto.AdminDashboardResponse.UrgentOrderDto;
import com.freight.order.entity.OrderStatus;
import com.freight.order.service.OrderService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Locale;
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
        SummaryMetrics summary = buildSummaryMetrics(now);

        List<UrgentOrderDto> urgentOrders = orderService.findUrgentUnassignedOrders(DASHBOARD_LIST_SIZE).stream()
                .map(order -> UrgentOrderDto.from(order, now))
                .toList();

        // 설계 시안(admin-dashboard.png)대로 신고 사유·시각을 보여 주려고 분쟁 화면과 같은 delivery 조회를 쓴다.
        List<DisputeSummaryResponse> disputeOrders = disputeQueryService.listDisputes(0).stream()
                .limit(DASHBOARD_LIST_SIZE)
                .toList();

        return new AdminDashboardResponse(summary, urgentOrders, disputeOrders);
    }

    private SummaryMetrics buildSummaryMetrics(LocalDateTime now) {
        LocalDate today = now.toLocalDate();
        LocalDateTime todayStart = today.atStartOfDay();
        LocalDateTime todayEnd = today.atTime(LocalTime.MAX);

        LocalDate yesterday = today.minusDays(1);
        LocalDateTime yesterdayStart = yesterday.atStartOfDay();
        LocalDateTime yesterdayEnd = yesterday.atTime(LocalTime.MAX);

        // 배차·완료 건수는 목록 조회와 1:1 일치하도록 assigned_at, completed_at 기준으로 집계한다.
        long todayRegistered = orderService.countOrdersCreatedBetween(todayStart, todayEnd);
        long yesterdayRegistered = orderService.countOrdersCreatedBetween(yesterdayStart, yesterdayEnd);
        long todayAssigned = orderService.countOrdersAssignedBetween(todayStart, todayEnd);
        long yesterdayAssigned = orderService.countOrdersAssignedBetween(yesterdayStart, yesterdayEnd);
        long todayCompleted = orderService.countOrdersCompletedBetween(todayStart, todayEnd);
        long yesterdayCompleted = orderService.countOrdersCompletedBetween(yesterdayStart, yesterdayEnd);
        long unassignedCount = orderService.countUnassignedOrders(now);
        long disputedCount = orderService.countOrdersByStatus(OrderStatus.DISPUTED);

        return new SummaryMetrics(
                todayRegistered,
                yesterdayRegistered,
                todayAssigned,
                yesterdayAssigned,
                todayCompleted,
                yesterdayCompleted,
                unassignedCount,
                disputedCount);
    }

    /**
     * 통계 카드별 상세 오더 목록을 조회한다.
     *
     * @param type 통계 유형 (TODAY_REGISTERED, TODAY_ASSIGNED, TODAY_COMPLETED, URGENT_UNASSIGNED)
     * @return 상세 오더 목록
     */
    public List<AdminDashboardOrderDto> getDashboardOrders(String type) {
        if (type == null) {
            return List.of();
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();
        LocalDateTime todayStart = today.atStartOfDay();
        LocalDateTime todayEnd = today.atTime(LocalTime.MAX);

        return switch (type.toUpperCase(Locale.ROOT)) {
            case "TODAY_REGISTERED" ->
                orderService.findOrdersCreatedBetween(todayStart, todayEnd).stream()
                        .map(order -> AdminDashboardOrderDto.of(order, order.getCreatedAt()))
                        .toList();
            case "TODAY_ASSIGNED" ->
                orderService.findOrdersAssignedBetween(todayStart, todayEnd).stream()
                        .map(order -> AdminDashboardOrderDto.of(order, order.getAssignedAt()))
                        .toList();
            case "TODAY_COMPLETED" ->
                orderService.findOrdersCompletedBetween(todayStart, todayEnd).stream()
                        .map(order -> AdminDashboardOrderDto.of(order, order.getCompletedAt()))
                        .toList();
            case "URGENT_UNASSIGNED" ->
                orderService.findUrgentUnassignedOrdersPastPickup(now).stream()
                        .map(order -> AdminDashboardOrderDto.of(order, order.getPickupAt()))
                        .toList();
            default -> List.of();
        };
    }
}

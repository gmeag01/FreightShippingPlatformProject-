package com.freight.delivery.service;

import com.freight.delivery.dto.JobDetailResponse;
import com.freight.delivery.dto.JobSummaryResponse;
import com.freight.delivery.dto.JobTab;
import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.order.entity.Order;
import com.freight.order.entity.OrderStatus;
import com.freight.order.service.OrderService;
import com.freight.payment.entity.PaymentStatus;
import com.freight.payment.service.PaymentService;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 차주의 내 운송 목록과 운송 상세를 조회하는 서비스.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class JobQueryService {

    private static final int DEFAULT_PAGE_SIZE = 20;

    private final OrderService orderService;
    private final PaymentService paymentService;

    @Value("${app.order.driver-cancel-cutoff-hours:2}")
    private long driverCancelCutoffHours;

    @Value("${app.order.auto-confirm-hours:24}")
    private long autoConfirmHours;

    /**
     * 내게 배정된 운송을 조회한다. 진행 중은 상차가 가까운 순, 그 밖에는 상차가 최근인 순이다.
     *
     * @param driverId 요청 차주 회원 ID
     * @param tab 진행 중 또는 끝난 운송 (null이면 전체)
     * @param page 0부터 시작하는 페이지 번호
     * @return 내 운송 목록 페이지
     */
    public Page<JobSummaryResponse> listJobs(Long driverId, JobTab tab, int page) {
        List<OrderStatus> statuses = tab != null ? tab.getStatuses() : Arrays.asList(OrderStatus.values());
        Sort.Direction direction = tab == JobTab.IN_PROGRESS ? Sort.Direction.ASC : Sort.Direction.DESC;
        PageRequest pageRequest = PageRequest.of(Math.max(page, 0), DEFAULT_PAGE_SIZE, Sort.by(direction, "pickupAt"));
        return orderService
                .findOrdersByDriver(driverId, statuses, pageRequest)
                .map(order -> JobSummaryResponse.from(order, findDriverCancelableUntil(order)));
    }

    /**
     * 내게 배정된 운송의 상세를 조회한다.
     *
     * @param orderId 오더 ID
     * @param driverId 요청 차주 회원 ID
     * @return 상세주소, 연락처, 화물, 결제 상태, 마감 시각, 상태 이력이 포함된 상세
     * @throws BusinessException 오더 없음(ORDER_NOT_FOUND), 배정된 차주가 아님(NOT_ORDER_OWNER)
     */
    public JobDetailResponse getJob(Long orderId, Long driverId) {
        Order order = orderService.getOrder(orderId);
        requireAssignedDriver(order, driverId);
        PaymentStatus paymentStatus = paymentService.findStatus(orderId).orElse(null);
        return JobDetailResponse.from(
                order,
                paymentStatus,
                findDriverCancelableUntil(order),
                findAutoConfirmAt(order),
                orderService.getHistory(orderId));
    }

    private void requireAssignedDriver(Order order, Long driverId) {
        // 설계 문서 2장: 상세주소와 연락처는 배정된 차주에게만 보여 준다.
        if (order.getDriver() == null || !Objects.equals(order.getDriver().getId(), driverId)) {
            throw new BusinessException(ErrorCode.NOT_ORDER_OWNER);
        }
    }

    private LocalDateTime findDriverCancelableUntil(Order order) {
        if (order.getStatus() != OrderStatus.ASSIGNED) {
            return null;
        }
        return order.getPickupAt().minusHours(driverCancelCutoffHours);
    }

    private LocalDateTime findAutoConfirmAt(Order order) {
        if (order.getStatus() != OrderStatus.AWAITING_CONFIRM) {
            return null;
        }
        return order.getDroppedOffAt().plusHours(autoConfirmHours);
    }
}

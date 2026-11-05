package com.freight.delivery.service;

import com.freight.delivery.dto.DisputeDetailResponse;
import com.freight.delivery.dto.DisputeSummaryResponse;
import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.order.entity.Order;
import com.freight.order.entity.OrderStatus;
import com.freight.order.entity.OrderStatusHistory;
import com.freight.order.service.OrderService;
import com.freight.payment.entity.PaymentStatus;
import com.freight.payment.service.PaymentService;
import com.freight.vehicle.entity.Vehicle;
import com.freight.vehicle.service.VehicleService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 관리자 분쟁 화면의 목록과 상세를 조회하는 서비스.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DisputeQueryService {

    private static final int DEFAULT_PAGE_SIZE = 20;

    private final OrderService orderService;
    private final PaymentService paymentService;
    private final VehicleService vehicleService;

    /**
     * 처리 대기 중인 분쟁을 최근에 신고된 순으로 조회한다.
     *
     * @param page 0부터 시작하는 페이지 번호
     * @return 신고 시각과 사유가 포함된 분쟁 목록 페이지
     */
    public Page<DisputeSummaryResponse> listDisputes(int page) {
        PageRequest pageRequest =
                PageRequest.of(Math.max(page, 0), DEFAULT_PAGE_SIZE, Sort.by(Sort.Direction.DESC, "updatedAt"));
        return orderService
                .findOrdersByStatus(OrderStatus.DISPUTED, pageRequest)
                .map(order -> DisputeSummaryResponse.from(order, findReport(orderService.getHistory(order.getId()))));
    }

    /**
     * 분쟁 상세를 조회한다. 처리가 끝난 분쟁도 볼 수 있다.
     *
     * @param orderId 오더 ID
     * @return 신고 사유, 회원, 차량, 화물, 결제 상태, 상태 이력이 포함된 상세
     * @throws BusinessException 오더 없음(ORDER_NOT_FOUND), 분쟁이 된 적 없는 오더(NOT_FOUND)
     */
    public DisputeDetailResponse getDispute(Long orderId) {
        Order order = orderService.getOrder(orderId);
        List<OrderStatusHistory> history = orderService.getHistory(orderId);
        OrderStatusHistory report = findReport(history);
        PaymentStatus paymentStatus = paymentService.findStatus(orderId).orElse(null);
        Vehicle vehicle =
                vehicleService.findByDriverId(order.getDriver().getId()).orElse(null);
        return DisputeDetailResponse.from(order, paymentStatus, report, vehicle, history);
    }

    private OrderStatusHistory findReport(List<OrderStatusHistory> history) {
        return history.stream()
                .filter(entry -> entry.getToStatus() == OrderStatus.DISPUTED)
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }
}

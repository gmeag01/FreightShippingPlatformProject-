package com.freight.order.service;

import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.member.entity.Member;
import com.freight.member.service.MemberService;
import com.freight.order.entity.Order;
import com.freight.order.entity.OrderStatus;
import com.freight.order.entity.OrderStatusHistory;
import com.freight.order.entity.StatusChange;
import com.freight.order.repository.OrderRepository;
import com.freight.order.repository.OrderStatusHistoryRepository;
import com.freight.vehicle.entity.VehicleType;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.function.BiFunction;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 오더 조회와 상태 변경을 다른 도메인에 제공한다. 상태 변경 시 이력도 함께 남긴다. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final MemberService memberService;

    /**
     * 오더 ID로 오더 엔티티를 조회한다.
     *
     * @param orderId 오더 ID
     * @return 오더 엔티티
     * @throws BusinessException 오더가 없는 경우(ORDER_NOT_FOUND)
     */
    public Order getOrder(Long orderId) {
        return orderRepository.findById(orderId).orElseThrow(() -> new BusinessException(ErrorCode.ORDER_NOT_FOUND));
    }

    /**
     * 배차 전(REGISTERED) 오더를 상차 시각이 가까운 순으로 조회한다.
     *
     * @param vehicleType 요구 차종, null이면 전체
     * @param pageable 페이지 정보
     * @return 열린 오더 페이지
     */
    public Page<Order> findOpenOrders(VehicleType vehicleType, Pageable pageable) {
        if (vehicleType == null) {
            return orderRepository.findByStatusOrderByPickupAtAsc(OrderStatus.REGISTERED, pageable);
        }
        return orderRepository.findByStatusAndRequiredVehicleTypeOrderByPickupAtAsc(
                OrderStatus.REGISTERED, vehicleType, pageable);
    }

    /**
     * 오더 상태를 바꾸고 이력을 같은 트랜잭션에 남긴다. 다른 도메인은 이 메서드로 상태를 바꾼다.
     *
     * @param orderId 오더 ID
     * @param actorId 처리자 회원 ID, 시스템 처리면 null
     * @param memo 이력에 남길 메모
     * @param transition Order의 상태 전이 메서드를 호출하는 함수
     * @return 변경 전후 상태
     * @throws BusinessException 오더나 처리자가 없거나 전이 규칙을 어긴 경우
     */
    @Transactional
    public StatusChange changeStatus(
            Long orderId, Long actorId, String memo, BiFunction<Order, Member, StatusChange> transition) {
        Order order = getOrder(orderId);
        Member actor = actorId != null ? memberService.getById(actorId) : null;
        StatusChange statusChange = transition.apply(order, actor);
        orderRepository.saveAndFlush(order);
        orderStatusHistoryRepository.save(OrderStatusHistory.builder()
                .order(order)
                .fromStatus(statusChange.from())
                .toStatus(statusChange.to())
                .actor(actor)
                .memo(memo)
                .build());
        return statusChange;
    }

    /**
     * 주어진 상태의 오더를 조회한다.
     *
     * @param status 찾을 오더 상태
     * @param pageable 페이지와 정렬
     * @return 오더 페이지
     */
    public Page<Order> findOrdersByStatus(OrderStatus status, Pageable pageable) {
        return orderRepository.findByStatus(status, pageable);
    }

    /**
     * 차주에게 배정된 오더 중 주어진 상태의 오더를 조회한다.
     *
     * @param driverId 차주 회원 ID
     * @param statuses 찾을 오더 상태들
     * @param pageable 페이지와 정렬
     * @return 오더 페이지
     */
    public Page<Order> findOrdersByDriver(Long driverId, Collection<OrderStatus> statuses, Pageable pageable) {
        return orderRepository.findByDriverIdAndStatusIn(driverId, statuses, pageable);
    }

    /**
     * 오더의 상태 이력을 오래된 순으로 조회한다.
     *
     * @param orderId 오더 ID
     * @return 상태 이력 목록
     */
    public List<OrderStatusHistory> getHistory(Long orderId) {
        return orderStatusHistoryRepository.findByOrderIdOrderByCreatedAtAscIdAsc(orderId);
    }

    /**
     * 수령확인대기 상태이고 주어진 시각 이전에 하차 완료된 오더의 ID를 찾는다.
     *
     * @param droppedOffBefore 이 시각 이전(포함)에 하차한 오더만 찾는다
     * @return 자동 확인 대상 오더 ID 목록
     */
    public List<Long> findAutoConfirmTargetIds(LocalDateTime droppedOffBefore) {
        return orderRepository.findIdsByStatusAndDroppedOffBefore(OrderStatus.AWAITING_CONFIRM, droppedOffBefore);
    }

    /**
     * 차주가 배차를 취소한 횟수를 센다. ASSIGNED에서 REGISTERED로 되돌린 이력을 취소로 본다.
     *
     * @param driverId 차주 회원 ID
     * @return 배차 취소 횟수
     */
    public long countDriverCancellations(Long driverId) {
        return orderStatusHistoryRepository.countByActorIdAndFromStatusAndToStatus(
                driverId, OrderStatus.ASSIGNED, OrderStatus.REGISTERED);
    }
}

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
import java.util.List;
import java.util.function.BiFunction;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final MemberService memberService;

    public Order getOrder(Long orderId) {
        return orderRepository.findById(orderId).orElseThrow(() -> new BusinessException(ErrorCode.ORDER_NOT_FOUND));
    }

    public Page<Order> findOpenOrders(VehicleType vehicleType, Pageable pageable) {
        if (vehicleType == null) {
            return orderRepository.findByStatusOrderByPickupAtAsc(OrderStatus.REGISTERED, pageable);
        }
        return orderRepository.findByStatusAndRequiredVehicleTypeOrderByPickupAtAsc(
                OrderStatus.REGISTERED, vehicleType, pageable);
    }

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
     * 수령확인대기 상태이고 주어진 시각 이전에 하차 완료된 오더의 ID를 찾는다.
     *
     * @param droppedOffBefore 이 시각 이전(포함)에 하차한 오더만 찾는다
     * @return 자동 확인 대상 오더 ID 목록
     */
    public List<Long> findAutoConfirmTargetIds(LocalDateTime droppedOffBefore) {
        return orderRepository.findIdsByStatusAndDroppedOffBefore(OrderStatus.AWAITING_CONFIRM, droppedOffBefore);
    }

    public long countDriverCancellations(Long driverId) {
        return orderStatusHistoryRepository.countByActorIdAndFromStatusAndToStatus(
                driverId, OrderStatus.ASSIGNED, OrderStatus.REGISTERED);
    }
}

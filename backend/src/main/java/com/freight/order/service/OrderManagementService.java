package com.freight.order.service;

import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.member.entity.Member;
import com.freight.member.entity.Role;
import com.freight.member.service.MemberService;
import com.freight.order.dto.*;
import com.freight.order.entity.*;
import com.freight.order.repository.OrderRepository;
import com.freight.order.repository.OrderStatusHistoryRepository;
import com.freight.vehicle.entity.VehicleType;
import com.freight.vehicle.service.VehicleService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 화주 오더 관리와 관리자 검색을 담당한다. matching이 사용하는 OrderService 계약은 유지한다. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderManagementService {
    private static final int PAGE_SIZE = 20;
    private final OrderRepository orderRepository;
    private final OrderStatusHistoryRepository historyRepository;
    private final OrderService orderService;
    private final MemberService memberService;
    private final OrderPaymentPort paymentPort;
    private final VehicleService vehicleService;

    @Value("${app.order.auto-confirm-hours:24}")
    private long autoConfirmHours;

    @Value("${app.order.driver-cancel-cutoff-hours:2}")
    private long driverCancelCutoffHours;

    /**
     * 새 오더와 등록 이력을 저장하고 같은 트랜잭션에서 결제를 보관한다.
     * @param shipperId 로그인한 화주 ID
     * @param request 검증된 운송 정보
     * @return 생성된 오더 상세
     * @throws BusinessException 권한·희망 시각이 잘못된 경우
     */
    @Transactional
    public OrderDetailResponse create(Long shipperId, SaveOrderRequest request) {
        Member shipper = memberService.getById(shipperId);
        requireRole(shipper, Role.SHIPPER);
        if (!request.pickupAt().isAfter(LocalDateTime.now())) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        Order order = orderRepository.saveAndFlush(Order.create(shipper, request.toSpec()));
        saveHistory(order, shipper, null, OrderStatus.REGISTERED, "화주 오더 등록");
        paymentPort.hold(order.getId(), order.getFare());
        return detail(order, true);
    }

    /**
     * 본인 오더만 상태별로 조회한다.
     * @param shipperId 로그인한 화주 ID
     * @param status 상태 필터, 없으면 전체
     * @param page 0부터 시작하는 페이지
     * @return 개인정보를 제외한 목록과 미배차 표시
     * @throws BusinessException 화주가 아닌 경우
     */
    public Page<OrderSummaryResponse> listMine(Long shipperId, OrderStatus status, int page) {
        requireRole(memberService.getById(shipperId), Role.SHIPPER);
        Specification<Order> spec =
                (root, query, cb) -> cb.equal(root.get("shipper").get("id"), shipperId);
        if (status != null) spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        return list(spec, page);
    }

    /**
     * 조회자의 소유·배정 관계에 맞게 상세주소와 연락처를 가린다.
     * @param orderId 조회할 오더 ID
     * @param actorId 조회 회원 ID
     * @return 권한에 맞게 가려진 상세 응답
     * @throws BusinessException 다른 화주의 오더이거나 공개되지 않은 오더인 경우
     */
    public OrderDetailResponse getDetail(Long orderId, Long actorId) {
        Order order = orderService.getOrder(orderId);
        Member actor = memberService.getById(actorId);
        boolean own = Objects.equals(order.getShipper().getId(), actorId);
        boolean assigned = order.getDriver() != null
                && Objects.equals(order.getDriver().getId(), actorId)
                && order.getStatus() != OrderStatus.REGISTERED;
        boolean full = actor.getRole() == Role.ADMIN || own || assigned;
        if (!full && !(actor.getRole() == Role.DRIVER && order.getStatus() == OrderStatus.REGISTERED)) {
            throw new BusinessException(ErrorCode.NOT_ORDER_OWNER);
        }
        return detail(order, full);
    }

    /**
     * 배차 전 본인 오더를 수정하고 운임 차액 처리를 요청한다.
     * @param orderId 수정할 오더 ID
     * @param shipperId 로그인한 화주 ID
     * @param request 화면에서 확인한 버전과 새 정보
     * @return 수정된 상세 응답
     * @throws BusinessException 소유·상태·버전이 맞지 않는 경우
     */
    @Transactional
    public OrderDetailResponse update(Long orderId, Long shipperId, UpdateOrderRequest request) {
        Order order = orderService.getOrder(orderId);
        Member shipper = memberService.getById(shipperId);
        requireRole(shipper, Role.SHIPPER);
        requireOwner(order, shipperId);
        requireVersion(order, request.version());
        long previousFare = order.updateDetails(shipper, request.details().toSpec());
        orderRepository.saveAndFlush(order);
        if (previousFare != order.getFare()) paymentPort.adjust(orderId, order.getFare());
        String memo = previousFare == order.getFare()
                ? "화주 오더 정보 수정"
                : "화주 오더 운임 수정: " + previousFare + "원 → " + order.getFare() + "원";
        saveHistory(order, shipper, OrderStatus.REGISTERED, OrderStatus.REGISTERED, memo);
        return detail(order, true);
    }

    /**
     * 화주 또는 관리자의 허용된 취소를 처리하고 환불을 요청한다.
     * @param orderId 취소할 오더 ID
     * @param actorId 화주 또는 관리자 ID
     * @param request 버전과 취소 사유
     * @return 취소된 오더 상세
     * @throws BusinessException 상태·소유·버전이 맞지 않거나 결제 연결이 없는 경우
     */
    @Transactional
    public OrderDetailResponse cancel(Long orderId, Long actorId, CancelOrderRequest request) {
        Order order = orderService.getOrder(orderId);
        Member actor = memberService.getById(actorId);
        if (actor.getRole() != Role.ADMIN) {
            requireRole(actor, Role.SHIPPER);
            requireOwner(order, actorId);
        }
        requireVersion(order, request.version());
        orderService.changeStatus(orderId, actorId, request.reason(), Order::cancel);
        paymentPort.refund(orderId);
        return detail(order, true);
    }

    /**
     * 관리자가 상태·희망 상차 기간·차종으로 전체 오더를 검색한다.
     * @param adminId 관리자 ID
     * @param status 상태, null이면 전체
     * @param vehicleType 요구 차종, null이면 전체
     * @param from 상차 희망일 시작, 포함
     * @param to 상차 희망일 끝, 포함
     * @param page 페이지 번호
     * @return 검색한 오더 목록
     * @throws BusinessException 관리자가 아니거나 날짜 범위가 잘못된 경우
     */
    public Page<OrderSummaryResponse> listAdmin(
            Long adminId, OrderStatus status, VehicleType vehicleType, LocalDate from, LocalDate to, int page) {
        requireRole(memberService.getById(adminId), Role.ADMIN);
        if (from != null && to != null && from.isAfter(to)) throw new BusinessException(ErrorCode.INVALID_INPUT);
        Specification<Order> spec = (root, query, cb) -> cb.conjunction();
        if (status != null) spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        if (vehicleType != null)
            spec = spec.and((root, query, cb) -> cb.equal(root.get("requiredVehicleType"), vehicleType));
        if (from != null)
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("pickupAt"), from.atStartOfDay()));
        if (to != null)
            spec = spec.and((root, query, cb) ->
                    cb.lessThan(root.get("pickupAt"), to.plusDays(1).atStartOfDay()));
        return list(spec, page);
    }

    private Page<OrderSummaryResponse> list(Specification<Order> spec, int page) {
        if (page < 0) throw new BusinessException(ErrorCode.INVALID_INPUT);
        LocalDateTime now = LocalDateTime.now();
        PageRequest paging = PageRequest.of(page, PAGE_SIZE, Sort.by(Sort.Direction.DESC, "id"));
        return orderRepository.findAll(spec, paging).map(order -> OrderSummaryResponse.from(order, now));
    }

    private OrderDetailResponse detail(Order order, boolean full) {
        var vehicle = full && order.getDriver() != null
                ? vehicleService.findByDriverId(order.getDriver().getId()).orElse(null)
                : null;
        return OrderDetailResponse.from(
                order,
                historyRepository.findByOrderIdOrderByCreatedAtAscIdAsc(order.getId()),
                full,
                vehicle,
                autoConfirmHours,
                driverCancelCutoffHours);
    }

    private void saveHistory(Order order, Member actor, OrderStatus from, OrderStatus to, String memo) {
        historyRepository.save(OrderStatusHistory.builder()
                .order(order)
                .actor(actor)
                .fromStatus(from)
                .toStatus(to)
                .memo(memo)
                .build());
    }

    private void requireRole(Member actor, Role role) {
        if (actor.getRole() != role) throw new BusinessException(ErrorCode.FORBIDDEN);
    }

    private void requireOwner(Order order, Long shipperId) {
        if (!Objects.equals(order.getShipper().getId(), shipperId))
            throw new BusinessException(ErrorCode.NOT_ORDER_OWNER);
    }

    private void requireVersion(Order order, Long version) {
        if (version == null || order.getVersion() != version) throw new BusinessException(ErrorCode.ORDER_CHANGED);
    }
}

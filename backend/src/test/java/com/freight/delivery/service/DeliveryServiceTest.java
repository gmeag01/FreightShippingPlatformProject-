package com.freight.delivery.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.freight.delivery.dto.DeliveryStatusResponse;
import com.freight.delivery.dto.ReportIssueRequest;
import com.freight.delivery.dto.ResolveDisputeRequest;
import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.member.entity.Member;
import com.freight.member.repository.MemberRepository;
import com.freight.order.entity.DisputeResolution;
import com.freight.order.entity.Order;
import com.freight.order.entity.OrderStatus;
import com.freight.order.entity.OrderStatusHistory;
import com.freight.order.repository.OrderRepository;
import com.freight.order.repository.OrderStatusHistoryRepository;
import com.freight.order.service.OrderService;
import com.freight.payment.entity.Payment;
import com.freight.payment.entity.PaymentStatus;
import com.freight.payment.entity.PaymentTransactionType;
import com.freight.payment.repository.PaymentRepository;
import com.freight.payment.repository.PaymentTransactionRepository;
import com.freight.payment.service.PaymentService;
import com.freight.support.Fixtures;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class DeliveryServiceTest {

    @Autowired
    private DeliveryService deliveryService;

    @Autowired
    private OrderService orderService;

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderStatusHistoryRepository orderStatusHistoryRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private PaymentTransactionRepository paymentTransactionRepository;

    private Long orderId;
    private Long shipperId;
    private Long driverId;
    private Long otherDriverId;
    private Long adminId;

    @BeforeEach
    void setUp() {
        Member shipper = memberRepository.save(Fixtures.shipper("delivery-shipper@freight.test"));
        shipperId = shipper.getId();
        driverId = memberRepository
                .save(Fixtures.driver("delivery-driver@freight.test"))
                .getId();
        otherDriverId = memberRepository
                .save(Fixtures.driver("delivery-other-driver@freight.test"))
                .getId();
        adminId = memberRepository.save(Fixtures.admin()).getId();

        Order order = orderRepository.save(Fixtures.registeredOrder(shipper));
        orderId = order.getId();
        paymentService.hold(orderId, order.getFare());
        orderService.changeStatus(
                orderId, driverId, null, (target, driver) -> target.accept(driver, LocalDateTime.now()));
    }

    private void moveToAwaitingConfirm() {
        deliveryService.pickup(orderId, driverId);
        deliveryService.dropoff(orderId, driverId);
    }

    private void moveToDisputed() {
        moveToAwaitingConfirm();
        deliveryService.report(orderId, shipperId, new ReportIssueRequest("화물 파손"));
    }

    private OrderStatus orderStatus() {
        return orderService.getOrder(orderId).getStatus();
    }

    private Payment payment() {
        return paymentRepository.findByOrderId(orderId).orElseThrow();
    }

    private long payoutCount() {
        return paymentTransactionRepository
                .findByPaymentIdOrderByIdAsc(payment().getId())
                .stream()
                .filter(transaction -> transaction.getType() == PaymentTransactionType.PAYOUT)
                .count();
    }

    private OrderStatusHistory lastHistory() {
        List<OrderStatusHistory> histories =
                orderStatusHistoryRepository.findByOrderIdOrderByCreatedAtAscIdAsc(orderId);
        return histories.get(histories.size() - 1);
    }

    private void assertFailsWith(ErrorCode errorCode, Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(errorCode);
    }

    @Test
    void pickup_movesToInTransit() {
        DeliveryStatusResponse response = deliveryService.pickup(orderId, driverId);

        assertThat(response.orderId()).isEqualTo(orderId);
        assertThat(response.status()).isEqualTo(OrderStatus.IN_TRANSIT);
        assertThat(orderStatus()).isEqualTo(OrderStatus.IN_TRANSIT);
    }

    @Test
    void pickup_byOtherDriver_fails() {
        assertFailsWith(ErrorCode.NOT_ORDER_OWNER, () -> deliveryService.pickup(orderId, otherDriverId));
    }

    @Test
    void dropoff_movesToAwaitingConfirm() {
        deliveryService.pickup(orderId, driverId);

        DeliveryStatusResponse response = deliveryService.dropoff(orderId, driverId);

        assertThat(response.status()).isEqualTo(OrderStatus.AWAITING_CONFIRM);
        assertThat(orderService.getOrder(orderId).getDroppedOffAt()).isNotNull();
    }

    @Test
    void confirm_completesOrderAndReleasesPayment() {
        moveToAwaitingConfirm();

        DeliveryStatusResponse response = deliveryService.confirm(orderId, shipperId);

        assertThat(response.status()).isEqualTo(OrderStatus.COMPLETED);
        assertThat(payment().getStatus()).isEqualTo(PaymentStatus.RELEASED);
        assertThat(payoutCount()).isEqualTo(1);
    }

    @Test
    void confirm_twice_failsAndPaysOnce() {
        moveToAwaitingConfirm();
        deliveryService.confirm(orderId, shipperId);

        assertFailsWith(ErrorCode.INVALID_STATUS_TRANSITION, () -> deliveryService.confirm(orderId, shipperId));

        assertThat(payoutCount()).isEqualTo(1);
    }

    @Test
    void confirm_beforeDropoff_fails() {
        deliveryService.pickup(orderId, driverId);

        assertFailsWith(ErrorCode.INVALID_STATUS_TRANSITION, () -> deliveryService.confirm(orderId, shipperId));

        assertThat(payment().getStatus()).isEqualTo(PaymentStatus.HELD);
    }

    @Test
    void report_keepsPaymentHeldAndRecordsReason() {
        moveToAwaitingConfirm();

        DeliveryStatusResponse response = deliveryService.report(orderId, shipperId, new ReportIssueRequest("화물 파손"));

        assertThat(response.status()).isEqualTo(OrderStatus.DISPUTED);
        assertThat(payment().getStatus()).isEqualTo(PaymentStatus.HELD);
        assertThat(lastHistory().getMemo()).isEqualTo("화물 파손");
    }

    @Test
    void resolve_payDriver_releasesPayment() {
        moveToDisputed();

        DeliveryStatusResponse response = deliveryService.resolveDispute(
                orderId, adminId, new ResolveDisputeRequest(DisputeResolution.PAY_DRIVER, "파손 없음 확인"));

        assertThat(response.status()).isEqualTo(OrderStatus.COMPLETED);
        assertThat(payment().getStatus()).isEqualTo(PaymentStatus.RELEASED);
    }

    @Test
    void resolve_refundShipper_cancelsAndRefunds() {
        moveToDisputed();

        DeliveryStatusResponse response = deliveryService.resolveDispute(
                orderId, adminId, new ResolveDisputeRequest(DisputeResolution.REFUND_SHIPPER, "파손 확인"));

        assertThat(response.status()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(payment().getStatus()).isEqualTo(PaymentStatus.REFUNDED);
    }

    @Test
    void resolve_recordsMemoInHistory() {
        moveToDisputed();

        deliveryService.resolveDispute(
                orderId, adminId, new ResolveDisputeRequest(DisputeResolution.REFUND_SHIPPER, "파손 확인"));

        assertThat(lastHistory().getMemo()).isEqualTo("파손 확인");
    }

    @Test
    void resolve_byShipper_fails() {
        moveToDisputed();

        assertFailsWith(
                ErrorCode.FORBIDDEN,
                () -> deliveryService.resolveDispute(
                        orderId, shipperId, new ResolveDisputeRequest(DisputeResolution.REFUND_SHIPPER, "환불")));
    }
}

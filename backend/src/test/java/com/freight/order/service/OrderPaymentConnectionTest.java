package com.freight.order.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;

import com.freight.member.entity.Member;
import com.freight.member.entity.Role;
import com.freight.member.repository.MemberRepository;
import com.freight.order.OrderRequests;
import com.freight.order.dto.CancelOrderRequest;
import com.freight.order.dto.OrderDetailResponse;
import com.freight.order.dto.UpdateOrderRequest;
import com.freight.order.entity.Order;
import com.freight.order.entity.OrderStatus;
import com.freight.order.repository.OrderRepository;
import com.freight.payment.dto.PaymentDetailResponse;
import com.freight.payment.dto.PaymentDetailResponse.TransactionResponse;
import com.freight.payment.entity.PaymentStatus;
import com.freight.payment.entity.PaymentTransactionType;
import com.freight.payment.service.PaymentGateway;
import com.freight.payment.service.PaymentService;
import com.freight.support.Fixtures;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

/** 오더 등록·수정·취소가 실제 PaymentService까지 이어지는지 검증한다. 롤백을 보려고 테스트에 트랜잭션을 걸지 않는다. */
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:order_payment;MODE=MariaDB;DATABASE_TO_LOWER=TRUE")
@ActiveProfiles("test")
class OrderPaymentConnectionTest {
    private static final long FARE = 350_000L;

    @Autowired
    OrderManagementService service;

    @Autowired
    OrderService orderService;

    @Autowired
    PaymentService paymentService;

    @Autowired
    MemberRepository members;

    @Autowired
    OrderRepository orders;

    @MockitoSpyBean
    PaymentGateway gateway;

    Member shipper;

    @BeforeEach
    void setUp() {
        shipper = members.save(Fixtures.shipper(UUID.randomUUID() + "@freight.test"));
    }

    private OrderDetailResponse createOrder() {
        return service.create(shipper.getId(), OrderRequests.valid(FARE));
    }

    private OrderDetailResponse updateFare(OrderDetailResponse order, long fare) {
        return service.update(
                order.id(), shipper.getId(), new UpdateOrderRequest(order.version(), OrderRequests.valid(fare)));
    }

    private PaymentDetailResponse paymentOf(Long orderId) {
        return paymentService.getPaymentDetail(orderId, shipper.getId(), Role.SHIPPER);
    }

    private List<PaymentTransactionType> transactionTypes(Long orderId) {
        return paymentOf(orderId).transactions().stream()
                .map(TransactionResponse::type)
                .toList();
    }

    @Test
    void create_holdsFareAsHeldPayment() {
        OrderDetailResponse order = createOrder();

        PaymentDetailResponse payment = paymentOf(order.id());
        assertThat(payment.status()).isEqualTo(PaymentStatus.HELD);
        assertThat(payment.amount()).isEqualTo(FARE);
        assertThat(transactionTypes(order.id())).containsExactly(PaymentTransactionType.CHARGE);
    }

    @Test
    void create_gatewayFailure_rollsBackOrderAndPayment() {
        long orderCount = orders.count();
        doThrow(new IllegalStateException("결제 실패")).when(gateway).charge(anyLong(), anyLong());

        assertThatThrownBy(this::createOrder).isInstanceOf(IllegalStateException.class);

        assertThat(orders.count()).isEqualTo(orderCount);
    }

    @Test
    void update_fareIncrease_chargesDifference() {
        OrderDetailResponse order = createOrder();

        updateFare(order, FARE + 50_000L);

        PaymentDetailResponse payment = paymentOf(order.id());
        assertThat(payment.amount()).isEqualTo(FARE + 50_000L);
        assertThat(payment.transactions().getLast().type()).isEqualTo(PaymentTransactionType.ADDITIONAL_CHARGE);
        assertThat(payment.transactions().getLast().amount()).isEqualTo(50_000L);
    }

    @Test
    void update_fareDecrease_refundsDifference() {
        OrderDetailResponse order = createOrder();

        updateFare(order, FARE - 50_000L);

        PaymentDetailResponse payment = paymentOf(order.id());
        assertThat(payment.amount()).isEqualTo(FARE - 50_000L);
        assertThat(payment.transactions().getLast().type()).isEqualTo(PaymentTransactionType.PARTIAL_REFUND);
        assertThat(payment.transactions().getLast().amount()).isEqualTo(50_000L);
    }

    @Test
    void update_sameFare_addsNoTransaction() {
        OrderDetailResponse order = createOrder();

        updateFare(order, FARE);

        assertThat(transactionTypes(order.id())).containsExactly(PaymentTransactionType.CHARGE);
    }

    @Test
    void update_gatewayFailure_keepsFareAndHeldAmount() {
        OrderDetailResponse order = createOrder();
        doThrow(new IllegalStateException("차액 실패")).when(gateway).charge(anyLong(), anyLong());

        assertThatThrownBy(() -> updateFare(order, FARE + 50_000L)).isInstanceOf(IllegalStateException.class);

        assertThat(orders.findById(order.id()).orElseThrow().getFare()).isEqualTo(FARE);
        assertThat(paymentOf(order.id()).amount()).isEqualTo(FARE);
    }

    @Test
    void cancel_byShipper_refundsPayment() {
        OrderDetailResponse order = createOrder();

        service.cancel(order.id(), shipper.getId(), new CancelOrderRequest(order.version(), "화주 취소"));

        assertThat(paymentOf(order.id()).status()).isEqualTo(PaymentStatus.REFUNDED);
        assertThat(transactionTypes(order.id()))
                .containsExactly(PaymentTransactionType.CHARGE, PaymentTransactionType.REFUND);
    }

    @Test
    void cancel_byAdminAfterAssignment_refundsPayment() {
        Member driver = members.save(Fixtures.driver(UUID.randomUUID() + "@freight.test"));
        Member admin = members.save(Member.builder()
                .email(UUID.randomUUID() + "@freight.test")
                .password("$2a$10$hashedpassword")
                .name("관리자")
                .phone("010-9999-0000")
                .role(Role.ADMIN)
                .build());
        Long orderId = createOrder().id();
        orderService.changeStatus(
                orderId, driver.getId(), null, (order, actor) -> order.accept(actor, LocalDateTime.now()));
        long version = orders.findById(orderId).orElseThrow().getVersion();

        service.cancel(orderId, admin.getId(), new CancelOrderRequest(version, "관리자 취소"));

        assertThat(paymentOf(orderId).status()).isEqualTo(PaymentStatus.REFUNDED);
    }

    @Test
    void cancel_gatewayFailure_keepsOrderAndPaymentHeld() {
        OrderDetailResponse created = createOrder();
        doThrow(new IllegalStateException("환불 실패")).when(gateway).refund(anyLong(), anyLong());

        assertThatThrownBy(() -> service.cancel(
                        created.id(), shipper.getId(), new CancelOrderRequest(created.version(), "화주 취소")))
                .isInstanceOf(IllegalStateException.class);

        Order order = orders.findById(created.id()).orElseThrow();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.REGISTERED);
        assertThat(paymentOf(created.id()).status()).isEqualTo(PaymentStatus.HELD);
    }
}

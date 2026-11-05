package com.freight.delivery.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.willThrow;

import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.member.entity.Member;
import com.freight.member.repository.MemberRepository;
import com.freight.order.entity.Order;
import com.freight.order.entity.OrderStatus;
import com.freight.order.repository.OrderRepository;
import com.freight.order.repository.OrderStatusHistoryRepository;
import com.freight.order.service.OrderService;
import com.freight.payment.entity.PaymentStatus;
import com.freight.payment.repository.PaymentRepository;
import com.freight.payment.repository.PaymentTransactionRepository;
import com.freight.payment.service.PaymentGateway;
import com.freight.payment.service.PaymentService;
import com.freight.support.Fixtures;
import java.time.LocalDateTime;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/** 설계 문서 3장: 결제가 실패하면 오더 상태와 이력도 함께 되돌아가는지 실제 트랜잭션으로 확인한다. */
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:delivery_rollback;MODE=MariaDB;DATABASE_TO_LOWER=TRUE")
@ActiveProfiles("test")
class DeliveryRollbackTest {

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

    @MockitoBean
    private PaymentGateway paymentGateway;

    private Long orderId;
    private Long shipperId;

    @BeforeEach
    void setUp() {
        Member shipper = memberRepository.save(Fixtures.shipper("rollback-shipper@freight.test"));
        Member driver = memberRepository.save(Fixtures.driver("rollback-driver@freight.test"));
        shipperId = shipper.getId();
        orderId = orderRepository.save(Fixtures.registeredOrder(shipper)).getId();
        orderService.changeStatus(
                orderId, driver.getId(), null, (order, actor) -> order.accept(actor, LocalDateTime.now()));
        orderService.changeStatus(orderId, driver.getId(), null, (order, actor) -> order.startTransit(actor));
        orderService.changeStatus(
                orderId, driver.getId(), null, (order, actor) -> order.completeDropoff(actor, LocalDateTime.now()));
    }

    @AfterEach
    void tearDown() {
        paymentTransactionRepository.deleteAllInBatch();
        paymentRepository.deleteAllInBatch();
        orderStatusHistoryRepository.deleteAllInBatch();
        orderRepository.deleteAllInBatch();
        memberRepository.deleteAllInBatch();
    }

    private void assertOrderUnchanged(long historyCount) {
        Order order = orderRepository.findById(orderId).orElseThrow();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.AWAITING_CONFIRM);
        assertThat(order.getCompletedAt()).isNull();
        assertThat(orderStatusHistoryRepository.count()).isEqualTo(historyCount);
    }

    @Test
    void confirm_whenGatewayFails_rollsBackOrderAndHistory() {
        paymentService.hold(orderId, 350_000L);
        willThrow(new IllegalStateException("지급 실패")).given(paymentGateway).payout(eq(orderId), anyLong());
        long historyCount = orderStatusHistoryRepository.count();

        assertThatThrownBy(() -> deliveryService.confirm(orderId, shipperId)).isInstanceOf(IllegalStateException.class);

        assertOrderUnchanged(historyCount);
        assertThat(paymentRepository.findByOrderId(orderId).orElseThrow().getStatus())
                .isEqualTo(PaymentStatus.HELD);
    }

    @Test
    void confirm_withoutPayment_keepsOrderUnchanged() {
        long historyCount = orderStatusHistoryRepository.count();

        assertThatThrownBy(() -> deliveryService.confirm(orderId, shipperId))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.PAYMENT_NOT_FOUND);

        assertOrderUnchanged(historyCount);
    }
}

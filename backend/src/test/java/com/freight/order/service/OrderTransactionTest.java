package com.freight.order.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.freight.member.entity.Member;
import com.freight.member.repository.MemberRepository;
import com.freight.order.OrderRequests;
import com.freight.order.dto.CancelOrderRequest;
import com.freight.order.dto.UpdateOrderRequest;
import com.freight.order.entity.Order;
import com.freight.order.entity.OrderStatus;
import com.freight.order.repository.OrderRepository;
import com.freight.order.repository.OrderStatusHistoryRepository;
import com.freight.support.Fixtures;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/** 테스트 자체에 트랜잭션을 걸지 않아 서비스 실패 후 실제 DB 롤백을 검증한다. */
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:order_transaction;MODE=MariaDB;DATABASE_TO_LOWER=TRUE")
@ActiveProfiles("test")
class OrderTransactionTest {
    @Autowired
    OrderManagementService service;

    @Autowired
    MemberRepository members;

    @Autowired
    OrderRepository orders;

    @Autowired
    OrderStatusHistoryRepository histories;

    @MockitoBean
    OrderPaymentPort payment;

    Member shipper;

    @BeforeEach
    void setUp() {
        shipper = members.save(Fixtures.shipper(UUID.randomUUID() + "@freight.test"));
    }

    @Test
    void create_paymentFailureRollsBackOrderAndHistory() {
        long beforeOrders = orders.count(), beforeHistory = histories.count();
        doThrow(new IllegalStateException("결제 실패")).when(payment).hold(anyLong(), anyLong());
        assertThatThrownBy(() -> service.create(shipper.getId(), OrderRequests.valid(350000)))
                .isInstanceOf(IllegalStateException.class);
        assertThat(orders.count()).isEqualTo(beforeOrders);
        assertThat(histories.count()).isEqualTo(beforeHistory);
    }

    @Test
    void update_paymentFailureRestoresFareVersionAndHistory() {
        Order order = orders.saveAndFlush(Fixtures.registeredOrder(shipper));
        long beforeHistory = histories.count();
        doThrow(new IllegalStateException("차액 실패")).when(payment).adjust(anyLong(), anyLong());
        assertThatThrownBy(() -> service.update(
                        order.getId(),
                        shipper.getId(),
                        new UpdateOrderRequest(order.getVersion(), OrderRequests.valid(400000))))
                .isInstanceOf(IllegalStateException.class);
        Order restored = orders.findById(order.getId()).orElseThrow();
        assertThat(restored.getFare()).isEqualTo(order.getFare());
        assertThat(restored.getVersion()).isEqualTo(order.getVersion());
        assertThat(histories.count()).isEqualTo(beforeHistory);
    }

    @Test
    void cancel_refundFailureRestoresStatusAndHistory() {
        Order order = orders.saveAndFlush(Fixtures.registeredOrder(shipper));
        long beforeHistory = histories.count();
        doThrow(new IllegalStateException("환불 실패")).when(payment).refund(anyLong());
        assertThatThrownBy(() -> service.cancel(
                        order.getId(), shipper.getId(), new CancelOrderRequest(order.getVersion(), "취소")))
                .isInstanceOf(IllegalStateException.class);
        assertThat(orders.findById(order.getId()).orElseThrow().getStatus()).isEqualTo(OrderStatus.REGISTERED);
        assertThat(histories.count()).isEqualTo(beforeHistory);
    }
}

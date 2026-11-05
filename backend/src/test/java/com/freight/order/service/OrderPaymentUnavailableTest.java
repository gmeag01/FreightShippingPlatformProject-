package com.freight.order.service;

import static org.assertj.core.api.Assertions.*;

import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
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

/** 결제 구현 없이도 앱이 기동되되 결제가 필요한 요청은 저장하지 않는지 검증한다. */
@SpringBootTest(
        properties = {
            "spring.datasource.url=jdbc:h2:mem:order_unavailable;MODE=MariaDB;DATABASE_TO_LOWER=TRUE",
            "app.order.payment-enabled=false"
        })
@ActiveProfiles("test")
class OrderPaymentUnavailableTest {
    @Autowired
    OrderManagementService service;

    @Autowired
    MemberRepository members;

    @Autowired
    OrderRepository orders;

    @Autowired
    OrderStatusHistoryRepository histories;

    Member shipper;

    @BeforeEach
    void setUp() {
        shipper = members.save(Fixtures.shipper(UUID.randomUUID() + "@freight.test"));
    }

    private void unavailable(Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ORDER_PAYMENT_UNAVAILABLE);
    }

    @Test
    void create_withoutPaymentDoesNotPublishOrder() {
        long count = orders.count();
        unavailable(() -> service.create(shipper.getId(), OrderRequests.valid(350000)));
        assertThat(orders.count()).isEqualTo(count);
    }

    @Test
    void update_withoutPaymentDoesNotChangeFareOrHistory() {
        Order order = orders.saveAndFlush(Fixtures.registeredOrder(shipper));
        long count = histories.count();
        unavailable(() -> service.update(
                order.getId(),
                shipper.getId(),
                new UpdateOrderRequest(order.getVersion(), OrderRequests.valid(400000))));
        assertThat(orders.findById(order.getId()).orElseThrow().getFare()).isEqualTo(order.getFare());
        assertThat(histories.count()).isEqualTo(count);
    }

    @Test
    void cancel_withoutPaymentDoesNotCancelOrder() {
        Order order = orders.saveAndFlush(Fixtures.registeredOrder(shipper));
        long count = histories.count();
        unavailable(
                () -> service.cancel(order.getId(), shipper.getId(), new CancelOrderRequest(order.getVersion(), "취소")));
        assertThat(orders.findById(order.getId()).orElseThrow().getStatus()).isEqualTo(OrderStatus.REGISTERED);
        assertThat(histories.count()).isEqualTo(count);
    }
}

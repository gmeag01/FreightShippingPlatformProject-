package com.freight.order.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.freight.member.repository.MemberRepository;
import com.freight.order.OrderRequests;
import com.freight.order.dto.CancelOrderRequest;
import com.freight.order.dto.UpdateOrderRequest;
import com.freight.order.entity.OrderStatus;
import com.freight.payment.entity.PaymentStatus;
import com.freight.payment.repository.PaymentRepository;
import com.freight.support.Fixtures;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/** 실제 결제 서비스 어댑터로 오더 등록·차액·취소가 연결되는지 확인한다. 게이트웨이만 더미다. */
@SpringBootTest(
        properties = "spring.datasource.url=jdbc:h2:mem:order_payment_integration;MODE=MariaDB;DATABASE_TO_LOWER=TRUE")
@ActiveProfiles("test")
class OrderPaymentIntegrationTest {
    @Autowired
    OrderManagementService orders;

    @Autowired
    MemberRepository members;

    @Autowired
    PaymentRepository payments;

    @Test
    void createUpdateCancel_updatesEscrowAndRefunds() {
        var shipper = members.save(Fixtures.shipper(UUID.randomUUID() + "@freight.test"));
        var created = orders.create(shipper.getId(), OrderRequests.valid(200000));
        assertThat(payments.findByOrderId(created.id()).orElseThrow().getStatus())
                .isEqualTo(PaymentStatus.HELD);
        var updated = orders.update(
                created.id(), shipper.getId(), new UpdateOrderRequest(created.version(), OrderRequests.valid(230000)));
        assertThat(payments.findByOrderId(created.id()).orElseThrow().getAmount())
                .isEqualTo(230000);
        var cancelled =
                orders.cancel(created.id(), shipper.getId(), new CancelOrderRequest(updated.version(), "연결 테스트 취소"));
        assertThat(cancelled.status()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(payments.findByOrderId(created.id()).orElseThrow().getStatus())
                .isEqualTo(PaymentStatus.REFUNDED);
    }
}

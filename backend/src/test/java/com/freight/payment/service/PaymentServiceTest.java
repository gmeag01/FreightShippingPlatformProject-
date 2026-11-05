package com.freight.payment.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.member.entity.Member;
import com.freight.member.repository.MemberRepository;
import com.freight.order.entity.Order;
import com.freight.order.repository.OrderRepository;
import com.freight.payment.entity.Payment;
import com.freight.payment.entity.PaymentStatus;
import com.freight.payment.entity.PaymentTransaction;
import com.freight.payment.entity.PaymentTransactionType;
import com.freight.payment.repository.PaymentRepository;
import com.freight.payment.repository.PaymentTransactionRepository;
import com.freight.support.Fixtures;
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
class PaymentServiceTest {

    private static final long FARE = 350_000L;

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private PaymentTransactionRepository paymentTransactionRepository;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private OrderRepository orderRepository;

    private Long orderId;

    @BeforeEach
    void setUp() {
        Member shipper = memberRepository.save(Fixtures.shipper("payment-shipper@freight.test"));
        Order order = orderRepository.save(Fixtures.registeredOrder(shipper));
        orderId = order.getId();
    }

    private Payment payment() {
        return paymentRepository.findByOrderId(orderId).orElseThrow();
    }

    private List<PaymentTransaction> transactions() {
        return paymentTransactionRepository.findByPaymentIdOrderByIdAsc(
                payment().getId());
    }

    private PaymentTransaction lastTransaction() {
        List<PaymentTransaction> transactions = transactions();
        return transactions.get(transactions.size() - 1);
    }

    private void assertFailsWith(ErrorCode errorCode, Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(errorCode);
    }

    @Test
    void hold_createsHeldPaymentAndChargeTransaction() {
        paymentService.hold(orderId, FARE);

        assertThat(payment().getStatus()).isEqualTo(PaymentStatus.HELD);
        assertThat(payment().getAmount()).isEqualTo(FARE);
        assertThat(transactions()).hasSize(1);
        assertThat(lastTransaction().getType()).isEqualTo(PaymentTransactionType.CHARGE);
        assertThat(lastTransaction().getAmount()).isEqualTo(FARE);
    }

    @Test
    void hold_withNonPositiveAmount_fails() {
        assertFailsWith(ErrorCode.INVALID_INPUT, () -> paymentService.hold(orderId, 0L));
    }

    @Test
    void adjust_increase_recordsAdditionalCharge() {
        paymentService.hold(orderId, FARE);

        paymentService.adjust(orderId, 400_000L);

        assertThat(payment().getAmount()).isEqualTo(400_000L);
        assertThat(lastTransaction().getType()).isEqualTo(PaymentTransactionType.ADDITIONAL_CHARGE);
        assertThat(lastTransaction().getAmount()).isEqualTo(50_000L);
    }

    @Test
    void adjust_decrease_recordsPartialRefund() {
        paymentService.hold(orderId, FARE);

        paymentService.adjust(orderId, 300_000L);

        assertThat(payment().getAmount()).isEqualTo(300_000L);
        assertThat(lastTransaction().getType()).isEqualTo(PaymentTransactionType.PARTIAL_REFUND);
        assertThat(lastTransaction().getAmount()).isEqualTo(50_000L);
    }

    @Test
    void adjust_sameAmount_recordsNothing() {
        paymentService.hold(orderId, FARE);

        paymentService.adjust(orderId, FARE);

        assertThat(transactions()).hasSize(1);
    }

    @Test
    void adjust_toNonPositiveAmount_fails() {
        paymentService.hold(orderId, FARE);

        assertFailsWith(ErrorCode.INVALID_INPUT, () -> paymentService.adjust(orderId, 0L));
    }

    @Test
    void adjust_afterRelease_fails() {
        paymentService.hold(orderId, FARE);
        paymentService.release(orderId);

        assertFailsWith(ErrorCode.PAYMENT_ALREADY_SETTLED, () -> paymentService.adjust(orderId, 400_000L));
    }

    @Test
    void release_recordsPayoutOfFullAmount() {
        paymentService.hold(orderId, FARE);
        paymentService.adjust(orderId, 400_000L);

        paymentService.release(orderId);

        assertThat(payment().getStatus()).isEqualTo(PaymentStatus.RELEASED);
        assertThat(lastTransaction().getType()).isEqualTo(PaymentTransactionType.PAYOUT);
        assertThat(lastTransaction().getAmount()).isEqualTo(400_000L);
    }

    @Test
    void refund_recordsRefundOfFullAmount() {
        paymentService.hold(orderId, FARE);

        paymentService.refund(orderId);

        assertThat(payment().getStatus()).isEqualTo(PaymentStatus.REFUNDED);
        assertThat(lastTransaction().getType()).isEqualTo(PaymentTransactionType.REFUND);
        assertThat(lastTransaction().getAmount()).isEqualTo(FARE);
    }

    @Test
    void release_twice_failsAndKeepsOnePayout() {
        paymentService.hold(orderId, FARE);
        paymentService.release(orderId);

        assertFailsWith(ErrorCode.PAYMENT_ALREADY_SETTLED, () -> paymentService.release(orderId));

        assertThat(transactions())
                .filteredOn(transaction -> transaction.getType() == PaymentTransactionType.PAYOUT)
                .hasSize(1);
    }

    @Test
    void release_withoutPayment_fails() {
        assertFailsWith(ErrorCode.PAYMENT_NOT_FOUND, () -> paymentService.release(orderId));
    }
}

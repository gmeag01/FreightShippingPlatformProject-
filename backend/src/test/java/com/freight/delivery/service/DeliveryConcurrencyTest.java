package com.freight.delivery.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.freight.member.entity.Member;
import com.freight.member.repository.MemberRepository;
import com.freight.order.entity.Order;
import com.freight.order.entity.OrderStatus;
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
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class DeliveryConcurrencyTest {

    private static final int ROUNDS = 10;

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

    @AfterEach
    void tearDown() {
        paymentTransactionRepository.deleteAllInBatch();
        paymentRepository.deleteAllInBatch();
        orderStatusHistoryRepository.deleteAllInBatch();
        orderRepository.deleteAllInBatch();
        memberRepository.deleteAllInBatch();
    }

    private Long createOverdueOrder(Member shipper, Member driver) {
        Order order = orderRepository.save(Fixtures.registeredOrder(shipper));
        Long orderId = order.getId();
        paymentService.hold(orderId, order.getFare());
        orderService.changeStatus(
                orderId, driver.getId(), null, (target, actor) -> target.accept(actor, LocalDateTime.now()));
        orderService.changeStatus(orderId, driver.getId(), null, (target, actor) -> target.startTransit(actor));
        orderService.changeStatus(
                orderId,
                driver.getId(),
                null,
                (target, actor) ->
                        target.completeDropoff(actor, LocalDateTime.now().minusHours(25)));
        return orderId;
    }

    /** 두 작업을 같은 순간에 시작하고, 예외 없이 끝난 작업 수를 돌려준다. 진 쪽의 예외는 정상 동작이다. */
    private int runSimultaneously(Runnable first, Runnable second) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(2);
        AtomicInteger successCount = new AtomicInteger();
        for (Runnable action : new Runnable[] {first, second}) {
            pool.submit(() -> {
                try {
                    start.await();
                    action.run();
                    successCount.incrementAndGet();
                } catch (Exception ignored) {
                    // 상태 오류나 낙관적 락 충돌로 진 쪽이다. 결과는 아래 검증에서 확인한다.
                } finally {
                    done.countDown();
                }
            });
        }
        start.countDown();
        done.await(10, TimeUnit.SECONDS);
        pool.shutdownNow();
        return successCount.get();
    }

    private long payoutCount(Payment payment) {
        return paymentTransactionRepository.findByPaymentIdOrderByIdAsc(payment.getId()).stream()
                .filter(transaction -> transaction.getType() == PaymentTransactionType.PAYOUT)
                .count();
    }

    @Test
    void confirmAndAutoConfirmSimultaneously_paysOnce() throws InterruptedException {
        Member shipper = memberRepository.save(Fixtures.shipper("race-shipper@freight.test"));
        Member driver = memberRepository.save(Fixtures.driver("race-driver@freight.test"));

        for (int round = 0; round < ROUNDS; round++) {
            Long orderId = createOverdueOrder(shipper, driver);

            int successCount = runSimultaneously(
                    () -> deliveryService.confirm(orderId, shipper.getId()),
                    () -> deliveryService.autoConfirm(orderId));

            Payment payment = paymentRepository.findByOrderId(orderId).orElseThrow();
            assertThat(successCount).isEqualTo(1);
            assertThat(orderRepository.findById(orderId).orElseThrow().getStatus())
                    .isEqualTo(OrderStatus.COMPLETED);
            assertThat(payment.getStatus()).isEqualTo(PaymentStatus.RELEASED);
            assertThat(payoutCount(payment)).isEqualTo(1);
        }
    }
}

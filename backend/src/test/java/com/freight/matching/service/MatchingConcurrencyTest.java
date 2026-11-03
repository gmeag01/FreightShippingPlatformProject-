package com.freight.matching.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.matching.dto.AcceptOrderRequest;
import com.freight.member.entity.Member;
import com.freight.member.repository.MemberRepository;
import com.freight.order.entity.Order;
import com.freight.order.entity.OrderStatus;
import com.freight.order.repository.OrderRepository;
import com.freight.order.repository.OrderStatusHistoryRepository;
import com.freight.support.Fixtures;
import com.freight.vehicle.entity.VehicleType;
import com.freight.vehicle.repository.VehicleRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
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
class MatchingConcurrencyTest {

    @Autowired
    private MatchingService matchingService;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderStatusHistoryRepository orderStatusHistoryRepository;

    @AfterEach
    void tearDown() {
        orderStatusHistoryRepository.deleteAllInBatch();
        orderRepository.deleteAllInBatch();
        vehicleRepository.deleteAllInBatch();
        memberRepository.deleteAllInBatch();
    }

    @Test
    void tenDriversAcceptSimultaneously_exactlyOneSucceedsAndNineGetOrderAlreadyAssigned() throws InterruptedException {
        Member shipper = memberRepository.save(Fixtures.shipper("concurrent-shipper@freight.test"));
        Order order = orderRepository.save(Fixtures.registeredOrder(
                shipper, VehicleType.TON_5, 3000, LocalDateTime.now().plusDays(1)));
        long initialVersion = order.getVersion();

        int threadCount = 10;
        List<Member> drivers = new ArrayList<>();
        for (int i = 0; i < threadCount; i++) {
            Member driver = memberRepository.save(Fixtures.driver("concurrent-driver-" + i + "@freight.test"));
            vehicleRepository.save(Fixtures.vehicle(driver, VehicleType.TON_5));
            drivers.add(driver);
        }

        ExecutorService pool = Executors.newFixedThreadPool(threadCount);
        CountDownLatch ready = new CountDownLatch(threadCount);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger();
        AtomicInteger alreadyAssignedCount = new AtomicInteger();
        List<Throwable> unexpectedErrors = new ArrayList<>();

        for (Member driver : drivers) {
            pool.submit(() -> {
                ready.countDown();
                try {
                    start.await();
                    matchingService.acceptOrder(
                            order.getId(), driver.getId(), new AcceptOrderRequest(initialVersion, false));
                    successCount.incrementAndGet();
                } catch (BusinessException ex) {
                    if (ex.getErrorCode() == ErrorCode.ORDER_ALREADY_ASSIGNED) {
                        alreadyAssignedCount.incrementAndGet();
                    } else {
                        synchronized (unexpectedErrors) {
                            unexpectedErrors.add(ex);
                        }
                    }
                } catch (Throwable t) {
                    synchronized (unexpectedErrors) {
                        unexpectedErrors.add(t);
                    }
                } finally {
                    done.countDown();
                }
            });
        }

        ready.await(5, TimeUnit.SECONDS);
        start.countDown();
        done.await(10, TimeUnit.SECONDS);
        pool.shutdownNow();

        assertThat(unexpectedErrors).isEmpty();
        assertThat(successCount.get()).isEqualTo(1);
        assertThat(alreadyAssignedCount.get()).isEqualTo(threadCount - 1);

        Order reloaded = orderRepository.findById(order.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(OrderStatus.ASSIGNED);
        assertThat(reloaded.getDriver()).isNotNull();
    }
}

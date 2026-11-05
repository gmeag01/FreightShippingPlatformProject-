package com.freight.delivery.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.freight.delivery.dto.JobDetailResponse;
import com.freight.delivery.dto.JobSummaryResponse;
import com.freight.delivery.dto.JobTab;
import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.member.entity.Member;
import com.freight.member.repository.MemberRepository;
import com.freight.order.entity.Order;
import com.freight.order.entity.OrderStatus;
import com.freight.order.repository.OrderRepository;
import com.freight.order.service.OrderService;
import com.freight.payment.dto.PayoutResponse;
import com.freight.payment.entity.PaymentStatus;
import com.freight.payment.service.PaymentService;
import com.freight.support.Fixtures;
import com.freight.vehicle.entity.VehicleType;
import java.time.Duration;
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
class JobQueryServiceTest {

    private static final LocalDateTime PICKUP_AT = LocalDateTime.of(2026, 12, 1, 10, 0);

    @Autowired
    private JobQueryService jobQueryService;

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

    private Member shipper;
    private Long driverId;
    private Long otherDriverId;

    @BeforeEach
    void setUp() {
        shipper = memberRepository.save(Fixtures.shipper("job-shipper@freight.test"));
        driverId = memberRepository
                .save(Fixtures.driver("job-driver@freight.test"))
                .getId();
        otherDriverId = memberRepository
                .save(Fixtures.driver("job-other-driver@freight.test"))
                .getId();
    }

    private Long createAssignedOrder(Long assignedDriverId, LocalDateTime pickupAt) {
        Order order = orderRepository.save(Fixtures.registeredOrder(shipper, VehicleType.TON_2_5, 1200, pickupAt));
        Long orderId = order.getId();
        paymentService.hold(orderId, order.getFare());
        orderService.changeStatus(
                orderId, assignedDriverId, null, (target, actor) -> target.accept(actor, LocalDateTime.now()));
        return orderId;
    }

    private Long createCompletedOrder(Long assignedDriverId) {
        Long orderId = createAssignedOrder(assignedDriverId, PICKUP_AT);
        deliveryService.pickup(orderId, assignedDriverId);
        deliveryService.dropoff(orderId, assignedDriverId);
        deliveryService.confirm(orderId, shipper.getId());
        return orderId;
    }

    private List<Long> jobIds(JobTab tab) {
        return jobQueryService.listJobs(driverId, tab, 0).getContent().stream()
                .map(JobSummaryResponse::orderId)
                .toList();
    }

    private void assertFailsWith(ErrorCode errorCode, Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(errorCode);
    }

    @Test
    void listJobs_inProgress_returnsOnlyMyActiveJobsByNearestPickup() {
        Long later = createAssignedOrder(driverId, PICKUP_AT.plusDays(1));
        Long sooner = createAssignedOrder(driverId, PICKUP_AT);
        createCompletedOrder(driverId);
        createAssignedOrder(otherDriverId, PICKUP_AT);

        assertThat(jobIds(JobTab.IN_PROGRESS)).containsExactly(sooner, later);
    }

    @Test
    void listJobs_finished_includesCompletedAndCancelledJobs() {
        Long completed = createCompletedOrder(driverId);
        Long cancelled = createAssignedOrder(driverId, PICKUP_AT);
        Member admin = memberRepository.save(Fixtures.admin());
        orderService.changeStatus(cancelled, admin.getId(), null, (order, actor) -> order.cancel(actor));
        createAssignedOrder(driverId, PICKUP_AT);

        assertThat(jobIds(JobTab.FINISHED)).containsExactlyInAnyOrder(completed, cancelled);
    }

    @Test
    void listJobs_withoutTab_returnsAllMyJobs() {
        Long active = createAssignedOrder(driverId, PICKUP_AT);
        Long completed = createCompletedOrder(driverId);

        assertThat(jobIds(null)).containsExactlyInAnyOrder(active, completed);
    }

    @Test
    void listJobs_showsDetailedAddressAndContact() {
        createAssignedOrder(driverId, PICKUP_AT);

        JobSummaryResponse job = jobQueryService
                .listJobs(driverId, JobTab.IN_PROGRESS, 0)
                .getContent()
                .get(0);

        assertThat(job.status()).isEqualTo(OrderStatus.ASSIGNED);
        assertThat(job.pickup().address()).isEqualTo("서울특별시 강남구 테헤란로 123");
        assertThat(job.dropoff().contactPhone()).isEqualTo("010-8765-4321");
        assertThat(job.driverCancelableUntil()).isEqualTo(PICKUP_AT.minusHours(2));
    }

    @Test
    void listJobs_afterDriverCancel_excludesJob() {
        Long orderId = createAssignedOrder(driverId, LocalDateTime.now().plusDays(1));
        orderService.changeStatus(
                orderId,
                driverId,
                "차량 고장",
                (order, driver) -> order.cancelAssignment(driver, LocalDateTime.now(), Duration.ofHours(2)));

        assertThat(jobIds(null)).doesNotContain(orderId);
    }

    @Test
    void getJob_returnsCargoShipperPaymentAndHistory() {
        Long orderId = createAssignedOrder(driverId, PICKUP_AT);

        JobDetailResponse job = jobQueryService.getJob(orderId, driverId);

        assertThat(job.pickup().detailAddress()).isEqualTo("1층 물류창고");
        assertThat(job.pickup().latitude()).isEqualTo(37.5012);
        assertThat(job.itemName()).isEqualTo("전자부품 파렛트");
        assertThat(job.weightKg()).isEqualTo(1200);
        assertThat(job.shipperName()).isEqualTo("화주");
        assertThat(job.paymentStatus()).isEqualTo(PaymentStatus.HELD);
        assertThat(job.driverCancelableUntil()).isEqualTo(PICKUP_AT.minusHours(2));
        assertThat(job.autoConfirmAt()).isNull();
        assertThat(job.history()).hasSize(1);
    }

    @Test
    void getJob_afterDropoff_returnsAutoConfirmTime() {
        Long orderId = createAssignedOrder(driverId, PICKUP_AT);
        deliveryService.pickup(orderId, driverId);
        deliveryService.dropoff(orderId, driverId);

        JobDetailResponse job = jobQueryService.getJob(orderId, driverId);

        assertThat(job.driverCancelableUntil()).isNull();
        assertThat(job.autoConfirmAt())
                .isEqualTo(orderService.getOrder(orderId).getDroppedOffAt().plusHours(24));
    }

    @Test
    void getJob_byOtherDriver_fails() {
        Long orderId = createAssignedOrder(driverId, PICKUP_AT);

        assertFailsWith(ErrorCode.NOT_ORDER_OWNER, () -> jobQueryService.getJob(orderId, otherDriverId));
    }

    @Test
    void getJob_afterDriverCancel_fails() {
        Long orderId = createAssignedOrder(driverId, LocalDateTime.now().plusDays(1));
        orderService.changeStatus(
                orderId,
                driverId,
                "차량 고장",
                (order, driver) -> order.cancelAssignment(driver, LocalDateTime.now(), Duration.ofHours(2)));

        assertFailsWith(ErrorCode.NOT_ORDER_OWNER, () -> jobQueryService.getJob(orderId, driverId));
    }

    @Test
    void listPayouts_returnsOnlyMyPayoutsNewestFirst() {
        Long first = createCompletedOrder(driverId);
        Long second = createCompletedOrder(driverId);
        createCompletedOrder(otherDriverId);
        createAssignedOrder(driverId, PICKUP_AT);

        List<PayoutResponse> payouts = paymentService.listPayouts(driverId, 0).getContent();

        assertThat(payouts).extracting(PayoutResponse::orderId).containsExactly(second, first);
        assertThat(payouts.get(0).amount()).isEqualTo(350_000L);
        assertThat(payouts.get(0).paidAt()).isNotNull();
    }
}

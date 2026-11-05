package com.freight.delivery.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.freight.delivery.dto.DisputeDetailResponse;
import com.freight.delivery.dto.DisputeSummaryResponse;
import com.freight.delivery.dto.ReportIssueRequest;
import com.freight.delivery.dto.ResolveDisputeRequest;
import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.member.entity.Member;
import com.freight.member.repository.MemberRepository;
import com.freight.order.entity.DisputeResolution;
import com.freight.order.entity.Order;
import com.freight.order.entity.OrderStatus;
import com.freight.order.repository.OrderRepository;
import com.freight.order.service.OrderService;
import com.freight.payment.entity.PaymentStatus;
import com.freight.payment.service.PaymentService;
import com.freight.support.Fixtures;
import com.freight.vehicle.entity.VehicleType;
import com.freight.vehicle.repository.VehicleRepository;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class DisputeQueryServiceTest {

    private static final String REASON = "화물 파손";

    @Autowired
    private DisputeQueryService disputeQueryService;

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
    private VehicleRepository vehicleRepository;

    private Member shipper;
    private Member driver;
    private Long adminId;

    @BeforeEach
    void setUp() {
        shipper = memberRepository.save(Fixtures.shipper("dispute-shipper@freight.test"));
        driver = memberRepository.save(Fixtures.driver("dispute-driver@freight.test"));
        adminId = memberRepository.save(Fixtures.admin()).getId();
        vehicleRepository.save(Fixtures.vehicle(driver, VehicleType.TON_5));
    }

    private Long createAwaitingConfirmOrder() {
        Order order = orderRepository.save(Fixtures.registeredOrder(shipper));
        Long orderId = order.getId();
        paymentService.hold(orderId, order.getFare());
        orderService.changeStatus(
                orderId, driver.getId(), null, (target, actor) -> target.accept(actor, LocalDateTime.now()));
        deliveryService.pickup(orderId, driver.getId());
        deliveryService.dropoff(orderId, driver.getId());
        return orderId;
    }

    private Long createDisputedOrder() {
        Long orderId = createAwaitingConfirmOrder();
        deliveryService.report(orderId, shipper.getId(), new ReportIssueRequest(REASON));
        return orderId;
    }

    @Test
    void listDisputes_returnsOnlyDisputedOrdersWithReason() {
        Long disputedId = createDisputedOrder();
        createAwaitingConfirmOrder();

        Page<DisputeSummaryResponse> disputes = disputeQueryService.listDisputes(0);

        assertThat(disputes.getContent()).hasSize(1);
        DisputeSummaryResponse dispute = disputes.getContent().get(0);
        assertThat(dispute.orderId()).isEqualTo(disputedId);
        assertThat(dispute.pickupRegion()).isEqualTo("서울 강남구");
        assertThat(dispute.dropoffRegion()).isEqualTo("부산 해운대구");
        assertThat(dispute.reason()).isEqualTo(REASON);
        assertThat(dispute.reportedAt()).isNotNull();
    }

    @Test
    void listDisputes_afterResolve_excludesOrder() {
        Long orderId = createDisputedOrder();
        deliveryService.resolveDispute(
                orderId, adminId, new ResolveDisputeRequest(DisputeResolution.PAY_DRIVER, "파손 없음"));

        assertThat(disputeQueryService.listDisputes(0).getContent()).isEmpty();
    }

    @Test
    void getDispute_returnsMembersVehicleCargoPaymentAndHistory() {
        Long orderId = createDisputedOrder();

        DisputeDetailResponse dispute = disputeQueryService.getDispute(orderId);

        assertThat(dispute.status()).isEqualTo(OrderStatus.DISPUTED);
        assertThat(dispute.fare()).isEqualTo(350_000L);
        assertThat(dispute.paymentStatus()).isEqualTo(PaymentStatus.HELD);
        assertThat(dispute.reason()).isEqualTo(REASON);
        assertThat(dispute.shipperName()).isEqualTo("화주");
        assertThat(dispute.driverName()).isEqualTo("차주");
        assertThat(dispute.vehicleType()).isEqualTo(VehicleType.TON_5);
        assertThat(dispute.plateNumber()).isEqualTo("80아1234");
        assertThat(dispute.itemName()).isEqualTo("전자부품 파렛트");
        assertThat(dispute.weightKg()).isEqualTo(1200);
        assertThat(dispute.history()).hasSize(4);
        assertThat(dispute.history().get(3).toStatus()).isEqualTo(OrderStatus.DISPUTED);
        assertThat(dispute.history().get(3).actorName()).isEqualTo("화주");
        assertThat(dispute.history().get(3).memo()).isEqualTo(REASON);
    }

    @Test
    void getDispute_afterResolve_stillReadable() {
        Long orderId = createDisputedOrder();
        deliveryService.resolveDispute(
                orderId, adminId, new ResolveDisputeRequest(DisputeResolution.REFUND_SHIPPER, "파손 확인"));

        DisputeDetailResponse dispute = disputeQueryService.getDispute(orderId);

        assertThat(dispute.status()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(dispute.paymentStatus()).isEqualTo(PaymentStatus.REFUNDED);
        assertThat(dispute.reason()).isEqualTo(REASON);
    }

    @Test
    void getDispute_withoutDriverVehicle_returnsEmptyVehicle() {
        Member noVehicleDriver = memberRepository.save(Fixtures.driver("no-vehicle@freight.test"));
        Order order = orderRepository.save(Fixtures.registeredOrder(shipper));
        Long orderId = order.getId();
        paymentService.hold(orderId, order.getFare());
        orderService.changeStatus(
                orderId, noVehicleDriver.getId(), null, (target, actor) -> target.accept(actor, LocalDateTime.now()));
        deliveryService.pickup(orderId, noVehicleDriver.getId());
        deliveryService.dropoff(orderId, noVehicleDriver.getId());
        deliveryService.report(orderId, shipper.getId(), new ReportIssueRequest(REASON));

        DisputeDetailResponse dispute = disputeQueryService.getDispute(orderId);

        assertThat(dispute.vehicleType()).isNull();
        assertThat(dispute.plateNumber()).isNull();
    }

    @Test
    void getDispute_forNeverDisputedOrder_fails() {
        Long orderId = createAwaitingConfirmOrder();

        assertThatThrownBy(() -> disputeQueryService.getDispute(orderId))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.NOT_FOUND);
    }

    @Test
    void getDispute_forMissingOrder_fails() {
        assertThatThrownBy(() -> disputeQueryService.getDispute(-1L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ORDER_NOT_FOUND);
    }
}

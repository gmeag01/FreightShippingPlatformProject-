package com.freight.matching.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.matching.dto.AcceptOrderRequest;
import com.freight.matching.dto.AcceptOrderResponse;
import com.freight.matching.dto.CancelAssignmentRequest;
import com.freight.matching.dto.OpenOrderResponse;
import com.freight.member.entity.Member;
import com.freight.member.repository.MemberRepository;
import com.freight.order.entity.Order;
import com.freight.order.entity.OrderStatus;
import com.freight.order.repository.OrderRepository;
import com.freight.order.service.OrderService;
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
class MatchingServiceTest {

    @Autowired
    private MatchingService matchingService;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderService orderService;

    private Member shipper;
    private Member driverWith5Ton;
    private Member driverWith1Ton;
    private Member driverWithoutVehicle;

    @BeforeEach
    void setUp() {
        shipper = memberRepository.save(Fixtures.shipper("shipper@freight.test"));
        driverWith5Ton = memberRepository.save(Fixtures.driver("driver5t@freight.test"));
        driverWith1Ton = memberRepository.save(Fixtures.driver("driver1t@freight.test"));
        driverWithoutVehicle = memberRepository.save(Fixtures.driver("novec@freight.test"));

        vehicleRepository.save(Fixtures.vehicle(driverWith5Ton, VehicleType.TON_5));
        vehicleRepository.save(Fixtures.vehicle(driverWith1Ton, VehicleType.TON_1));
    }

    @Test
    void listOpenOrders_filtersByRegisteredAndVehicleType_andOrdersByPickupAtAsc() {
        LocalDateTime now = LocalDateTime.now().plusDays(1);
        Order later5Ton =
                orderRepository.save(Fixtures.registeredOrder(shipper, VehicleType.TON_5, 3000, now.plusHours(5)));
        Order sooner5Ton =
                orderRepository.save(Fixtures.registeredOrder(shipper, VehicleType.TON_5, 2000, now.plusHours(1)));
        orderRepository.save(Fixtures.registeredOrder(shipper, VehicleType.TON_1, 800, now.plusHours(2)));

        Order cancelled5Ton = Fixtures.registeredOrder(shipper, VehicleType.TON_5, 2500, now.plusMinutes(30));
        cancelled5Ton.cancel(shipper);
        orderRepository.save(cancelled5Ton);

        Page<OpenOrderResponse> result = matchingService.listOpenOrders(VehicleType.TON_5, 0);

        assertThat(result.getContent())
                .extracting(OpenOrderResponse::id)
                .containsExactly(sooner5Ton.getId(), later5Ton.getId());
        assertThat(result.getContent().getFirst().pickupRegion()).isEqualTo("서울 강남구");
        assertThat(result.getContent().getFirst().dropoffRegion()).isEqualTo("부산 해운대구");
    }

    @Test
    void acceptOrder_withoutVehicle_throwsVehicleRequired() {
        Order order = orderRepository.save(Fixtures.registeredOrder(
                shipper, VehicleType.TON_5, 3000, LocalDateTime.now().plusDays(1)));

        assertThatThrownBy(() -> matchingService.acceptOrder(
                        order.getId(), driverWithoutVehicle.getId(), new AcceptOrderRequest(order.getVersion(), false)))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.VEHICLE_REQUIRED);
    }

    @Test
    void acceptOrder_whenVersionDiffers_throwsOrderChanged() {
        Order order = orderRepository.save(Fixtures.registeredOrder(
                shipper, VehicleType.TON_5, 3000, LocalDateTime.now().plusDays(1)));

        assertThatThrownBy(() -> matchingService.acceptOrder(
                        order.getId(), driverWith5Ton.getId(), new AcceptOrderRequest(order.getVersion() + 1, false)))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ORDER_CHANGED);
    }

    @Test
    void acceptOrder_whenVehicleTypeMismatchesAndNotConfirmed_throwsVehicleMismatchWithDetails() {
        Order order = orderRepository.save(Fixtures.registeredOrder(
                shipper, VehicleType.TON_1, 800, LocalDateTime.now().plusDays(1)));

        assertThatThrownBy(() -> matchingService.acceptOrder(
                        order.getId(), driverWith5Ton.getId(), new AcceptOrderRequest(order.getVersion(), false)))
                .isInstanceOfSatisfying(BusinessException.class, ex -> {
                    assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.VEHICLE_MISMATCH);
                    assertThat(ex.getDetails())
                            .containsEntry("driverVehicleType", "TON_5")
                            .containsEntry("requiredVehicleType", "TON_1")
                            .containsEntry("weightKg", "800")
                            .containsEntry("maxLoadKg", "5000");
                });
    }

    @Test
    void acceptOrder_whenOverweightAndNotConfirmed_throwsVehicleMismatchWithDetails() {
        Order order = orderRepository.save(Fixtures.registeredOrder(
                shipper, VehicleType.TON_1, 5000, LocalDateTime.now().plusDays(1)));

        assertThatThrownBy(() -> matchingService.acceptOrder(
                        order.getId(), driverWith1Ton.getId(), new AcceptOrderRequest(order.getVersion(), false)))
                .isInstanceOfSatisfying(BusinessException.class, ex -> {
                    assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.VEHICLE_MISMATCH);
                    assertThat(ex.getDetails())
                            .containsEntry("driverVehicleType", "TON_1")
                            .containsEntry("requiredVehicleType", "TON_1")
                            .containsEntry("weightKg", "5000")
                            .containsEntry("maxLoadKg", "1000");
                });
    }

    @Test
    void acceptOrder_whenMismatchConfirmed_succeeds() {
        Order order = orderRepository.save(Fixtures.registeredOrder(
                shipper, VehicleType.TON_1, 5000, LocalDateTime.now().plusDays(1)));

        AcceptOrderResponse response = matchingService.acceptOrder(
                order.getId(), driverWith1Ton.getId(), new AcceptOrderRequest(order.getVersion(), true));

        assertThat(response.status()).isEqualTo(OrderStatus.ASSIGNED);
        assertThat(response.driverId()).isEqualTo(driverWith1Ton.getId());
    }

    @Test
    void cancelAssignment_beforeCutoff_returnsToRegisteredAndIncrementsCancellationCount() {
        Order order = orderRepository.save(Fixtures.registeredOrder(
                shipper, VehicleType.TON_5, 3000, LocalDateTime.now().plusHours(4)));
        matchingService.acceptOrder(
                order.getId(), driverWith5Ton.getId(), new AcceptOrderRequest(order.getVersion(), false));

        matchingService.cancelAssignment(
                order.getId(), driverWith5Ton.getId(), new CancelAssignmentRequest("차량 고장으로 인한 취소"));

        Order reloaded = orderService.getOrder(order.getId());
        assertThat(reloaded.getStatus()).isEqualTo(OrderStatus.REGISTERED);
        assertThat(reloaded.getDriver()).isNull();
        assertThat(orderService.countDriverCancellations(driverWith5Ton.getId()))
                .isEqualTo(1L);
    }

    @Test
    void cancelAssignment_withinCutoff_throwsDriverCancelCutoffPassed() {
        Order order = orderRepository.save(Fixtures.registeredOrder(
                shipper, VehicleType.TON_5, 3000, LocalDateTime.now().plusMinutes(90)));
        matchingService.acceptOrder(
                order.getId(), driverWith5Ton.getId(), new AcceptOrderRequest(order.getVersion(), false));

        assertThatThrownBy(() -> matchingService.cancelAssignment(
                        order.getId(), driverWith5Ton.getId(), new CancelAssignmentRequest("단순 변심")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.DRIVER_CANCEL_CUTOFF_PASSED);
    }
}

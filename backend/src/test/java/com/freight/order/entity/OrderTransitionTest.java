package com.freight.order.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.member.entity.Member;
import com.freight.support.Fixtures;
import java.time.Duration;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

/** 오더 상태와 행위자, 취소·자동 확인 경계 시간을 검증한다. */
class OrderTransitionTest {
    private static final LocalDateTime PICKUP = LocalDateTime.of(2026, 12, 1, 10, 0);
    private static final LocalDateTime DROPOFF = PICKUP.plusHours(6);
    private final Member shipper = Fixtures.shipper();
    private final Member driver = Fixtures.driver();
    private final Member otherDriver = Fixtures.driver("other-driver@freight.test");
    private final Member otherShipper = Fixtures.shipper("other-shipper@freight.test");
    private final Member admin = Fixtures.admin();

    private OrderSpec spec() {
        Order sample = Fixtures.registeredOrder(shipper);
        return new OrderSpec(
                sample.getPickup(),
                sample.getDropoff(),
                PICKUP,
                DROPOFF,
                sample.getCargo(),
                sample.getRequiredVehicleType(),
                sample.getBodyType(),
                sample.getLoadingMethod(),
                sample.getMemo(),
                sample.getFare(),
                sample.getRecommendedFare(),
                sample.getDistanceKm());
    }

    private Order registered() {
        return Order.create(shipper, spec());
    }

    private Order assigned() {
        Order order = registered();
        order.accept(driver, PICKUP.minusDays(1));
        return order;
    }

    private Order awaiting() {
        Order order = assigned();
        order.startTransit(driver);
        order.completeDropoff(driver, DROPOFF);
        return order;
    }

    private void rejects(Runnable action, ErrorCode code) {
        assertThatThrownBy(action::run)
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(code);
    }

    @Test
    void happyPath_registeredToCompleted() {
        Order order = registered();
        assertThat(order.accept(driver, PICKUP))
                .isEqualTo(new StatusChange(OrderStatus.REGISTERED, OrderStatus.ASSIGNED));
        order.startTransit(driver);
        order.completeDropoff(driver, DROPOFF);
        order.confirmReceipt(shipper, DROPOFF.plusHours(1));
        assertThat(order.getStatus()).isEqualTo(OrderStatus.COMPLETED);
        assertThat(order.getCompletedAt()).isEqualTo(DROPOFF.plusHours(1));
    }

    @Test
    void create_byDriver_fails() {
        rejects(() -> Order.create(driver, spec()), ErrorCode.FORBIDDEN);
    }

    @Test
    void accept_whenAlreadyAssigned_fails() {
        rejects(() -> assigned().accept(otherDriver, PICKUP), ErrorCode.INVALID_STATUS_TRANSITION);
    }

    @Test
    void accept_byShipper_fails() {
        rejects(() -> registered().accept(shipper, PICKUP), ErrorCode.FORBIDDEN);
    }

    @Test
    void startTransit_beforeAssignment_fails() {
        rejects(() -> registered().startTransit(driver), ErrorCode.NOT_ORDER_OWNER);
    }

    @Test
    void startTransit_byOtherDriver_fails() {
        rejects(() -> assigned().startTransit(otherDriver), ErrorCode.NOT_ORDER_OWNER);
    }

    @Test
    void completeDropoff_beforePickup_fails() {
        rejects(() -> assigned().completeDropoff(driver, DROPOFF), ErrorCode.INVALID_STATUS_TRANSITION);
    }

    @Test
    void completeDropoff_byOtherDriver_fails() {
        rejects(() -> awaiting().completeDropoff(otherDriver, DROPOFF), ErrorCode.NOT_ORDER_OWNER);
    }

    @Test
    void cancel_byShipperAfterAssigned_fails() {
        rejects(() -> assigned().cancel(shipper), ErrorCode.INVALID_STATUS_TRANSITION);
    }

    @Test
    void cancel_byOtherShipper_fails() {
        rejects(() -> registered().cancel(otherShipper), ErrorCode.NOT_ORDER_OWNER);
    }

    @Test
    void cancel_byOwnerBeforeAssignment_succeeds() {
        assertThat(registered().cancel(shipper).to()).isEqualTo(OrderStatus.CANCELLED);
    }

    @Test
    void cancel_byAdminWhenAssigned_succeeds() {
        assertThat(assigned().cancel(admin).to()).isEqualTo(OrderStatus.CANCELLED);
    }

    @Test
    void cancel_byAdminWhenInTransit_fails() {
        Order order = assigned();
        order.startTransit(driver);
        rejects(() -> order.cancel(admin), ErrorCode.INVALID_STATUS_TRANSITION);
    }

    @Test
    void cancelAssignment_before2h_returnsToRegistered() {
        Order order = assigned();
        order.cancelAssignment(driver, PICKUP.minusHours(3), Duration.ofHours(2));
        assertThat(order.getStatus()).isEqualTo(OrderStatus.REGISTERED);
        assertThat(order.getDriver()).isNull();
        assertThat(order.getAssignedAt()).isNull();
    }

    @Test
    void cancelAssignment_within2h_fails() {
        rejects(
                () -> assigned().cancelAssignment(driver, PICKUP.minusMinutes(119), Duration.ofHours(2)),
                ErrorCode.DRIVER_CANCEL_CUTOFF_PASSED);
    }

    @Test
    void cancelAssignment_exactly2hBefore_fails() {
        rejects(
                () -> assigned().cancelAssignment(driver, PICKUP.minusHours(2), Duration.ofHours(2)),
                ErrorCode.DRIVER_CANCEL_CUTOFF_PASSED);
    }

    @Test
    void autoConfirm_before24h_fails() {
        rejects(
                () -> awaiting().autoConfirm(DROPOFF.plusHours(24).minusNanos(1), Duration.ofHours(24)),
                ErrorCode.INVALID_STATUS_TRANSITION);
    }

    @Test
    void autoConfirm_exactly24h_completes() {
        assertThat(awaiting()
                        .autoConfirm(DROPOFF.plusHours(24), Duration.ofHours(24))
                        .to())
                .isEqualTo(OrderStatus.COMPLETED);
    }

    @Test
    void confirmReceipt_byOtherShipper_fails() {
        rejects(() -> awaiting().confirmReceipt(otherShipper, DROPOFF), ErrorCode.NOT_ORDER_OWNER);
    }

    @Test
    void reportIssue_thenAdminPaysDriver_completes() {
        Order order = awaiting();
        order.reportIssue(shipper);
        order.resolveDispute(admin, DisputeResolution.PAY_DRIVER, DROPOFF);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.COMPLETED);
    }

    @Test
    void reportIssue_thenAdminRefunds_cancels() {
        Order order = awaiting();
        order.reportIssue(shipper);
        order.resolveDispute(admin, DisputeResolution.REFUND_SHIPPER, DROPOFF);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
    }

    @Test
    void resolveDispute_byShipper_fails() {
        Order order = awaiting();
        order.reportIssue(shipper);
        rejects(() -> order.resolveDispute(shipper, DisputeResolution.PAY_DRIVER, DROPOFF), ErrorCode.FORBIDDEN);
    }

    @Test
    void resolveDispute_withoutResolution_failsWithoutMutation() {
        Order order = awaiting();
        order.reportIssue(shipper);
        rejects(() -> order.resolveDispute(admin, null, DROPOFF), ErrorCode.INVALID_INPUT);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.DISPUTED);
    }

    @Test
    void updateDetails_whenAssigned_fails() {
        rejects(() -> assigned().updateDetails(shipper, spec()), ErrorCode.INVALID_STATUS_TRANSITION);
    }

    @Test
    void updateDetails_byOtherShipper_fails() {
        rejects(() -> registered().updateDetails(otherShipper, spec()), ErrorCode.NOT_ORDER_OWNER);
    }

    @Test
    void updateDetails_returnsPreviousFare() {
        assertThat(registered().updateDetails(shipper, spec())).isEqualTo(350000);
    }

    @Test
    void confirmReceipt_twice_secondFails() {
        Order order = awaiting();
        order.confirmReceipt(shipper, DROPOFF);
        rejects(() -> order.confirmReceipt(shipper, DROPOFF), ErrorCode.INVALID_STATUS_TRANSITION);
    }
}

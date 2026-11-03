package com.freight;

import static org.assertj.core.api.Assertions.assertThat;

import com.freight.fare.entity.FareRate;
import com.freight.fare.entity.FareSurcharge;
import com.freight.fare.entity.SurchargeType;
import com.freight.global.config.JpaConfig;
import com.freight.member.entity.Member;
import com.freight.order.entity.Order;
import com.freight.order.entity.OrderStatus;
import com.freight.order.entity.OrderStatusHistory;
import com.freight.payment.entity.Payment;
import com.freight.payment.entity.PaymentStatus;
import com.freight.payment.entity.PaymentTransaction;
import com.freight.payment.entity.PaymentTransactionType;
import com.freight.support.Fixtures;
import com.freight.vehicle.entity.Vehicle;
import com.freight.vehicle.entity.VehicleType;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@Import(JpaConfig.class)
@ActiveProfiles("test")
class ErdMappingTest {

    @Autowired
    private TestEntityManager em;

    @Test
    void allEntitiesPersistAndReload() {
        Member shipper = em.persist(Fixtures.shipper());
        Member driver = em.persist(Fixtures.driver());
        Vehicle vehicle = em.persist(Fixtures.vehicle(driver, VehicleType.TON_5));
        Order order = em.persist(Fixtures.registeredOrder(shipper));
        OrderStatusHistory history = em.persist(OrderStatusHistory.builder()
                .order(order)
                .fromStatus(null)
                .toStatus(OrderStatus.REGISTERED)
                .actor(shipper)
                .memo("오더 등록")
                .build());
        FareRate fareRate = em.persist(FareRate.builder()
                .vehicleType(VehicleType.TON_1)
                .baseFare(30_000L)
                .perKmFare(1_000L)
                .build());
        FareSurcharge surcharge = em.persist(FareSurcharge.builder()
                .type(SurchargeType.NIGHT)
                .rate(new BigDecimal("0.20"))
                .build());
        Payment payment = em.persist(Payment.builder()
                .order(order)
                .amount(order.getFare())
                .status(PaymentStatus.HELD)
                .build());
        PaymentTransaction tx = em.persist(PaymentTransaction.builder()
                .payment(payment)
                .type(PaymentTransactionType.CHARGE)
                .amount(order.getFare())
                .build());

        Long orderId = order.getId();
        Long paymentId = payment.getId();
        Long vehicleId = vehicle.getId();
        Long historyId = history.getId();
        Long txId = tx.getId();

        em.flush();
        em.clear();

        Order found = em.find(Order.class, orderId);
        assertThat(found.getPickup().getRegion()).isEqualTo("서울 강남구");
        assertThat(found.getCargo().getWeightKg()).isEqualTo(1200);
        assertThat(found.getStatus()).isEqualTo(OrderStatus.REGISTERED);
        assertThat(found.getVersion()).isZero();
        assertThat(found.getCreatedAt()).isNotNull();
        assertThat(em.find(Payment.class, paymentId).getStatus()).isEqualTo(PaymentStatus.HELD);
        assertThat(em.find(Vehicle.class, vehicleId).getVehicleType()).isEqualTo(VehicleType.TON_5);
        assertThat(em.find(OrderStatusHistory.class, historyId).getToStatus()).isEqualTo(OrderStatus.REGISTERED);
        assertThat(em.find(FareRate.class, VehicleType.TON_1).getBaseFare()).isEqualTo(fareRate.getBaseFare());
        assertThat(em.find(FareSurcharge.class, SurchargeType.NIGHT).getRate())
                .isEqualByComparingTo(surcharge.getRate());
        assertThat(em.find(PaymentTransaction.class, txId).getType()).isEqualTo(PaymentTransactionType.CHARGE);
    }

    @Test
    void vehicleTypeMaxLoads() {
        assertThat(VehicleType.TON_1.getMaxLoadKg()).isEqualTo(1000);
        assertThat(VehicleType.TON_2_5.getMaxLoadKg()).isEqualTo(2500);
        assertThat(VehicleType.TON_5.getMaxLoadKg()).isEqualTo(5000);
        assertThat(VehicleType.TON_11.getMaxLoadKg()).isEqualTo(11000);
        assertThat(VehicleType.TON_25.getMaxLoadKg()).isEqualTo(25000);
    }
}

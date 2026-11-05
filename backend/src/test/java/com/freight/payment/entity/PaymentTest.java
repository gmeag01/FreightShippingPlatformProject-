package com.freight.payment.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import org.junit.jupiter.api.Test;

class PaymentTest {

    private Payment heldPayment() {
        return Payment.builder().amount(350_000L).build();
    }

    private void assertAlreadySettled(Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.PAYMENT_ALREADY_SETTLED);
    }

    @Test
    void release_fromHeld_becomesReleased() {
        Payment payment = heldPayment();

        payment.release();

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.RELEASED);
    }

    @Test
    void refund_fromHeld_becomesRefunded() {
        Payment payment = heldPayment();

        payment.refund();

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.REFUNDED);
    }

    @Test
    void release_afterRefund_fails() {
        Payment payment = heldPayment();
        payment.refund();

        assertAlreadySettled(payment::release);
    }

    @Test
    void refund_afterRelease_fails() {
        Payment payment = heldPayment();
        payment.release();

        assertAlreadySettled(payment::refund);
    }

    @Test
    void changeAmount_afterRelease_fails() {
        Payment payment = heldPayment();
        payment.release();

        assertAlreadySettled(() -> payment.changeAmount(400_000L));
    }
}

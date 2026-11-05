package com.freight.payment.repository;

import com.freight.payment.entity.Payment;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** 결제 저장소. */
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByOrderId(Long orderId);
}

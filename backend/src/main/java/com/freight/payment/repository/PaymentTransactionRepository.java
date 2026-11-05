package com.freight.payment.repository;

import com.freight.payment.entity.PaymentTransaction;
import com.freight.payment.entity.PaymentTransactionType;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {
    List<PaymentTransaction> findByPaymentIdOrderByIdAsc(Long paymentId);

    @Query(
            value = "select t from PaymentTransaction t join fetch t.payment p join fetch p.order o"
                    + " where t.type = :type and o.driver.id = :driverId order by t.id desc",
            countQuery = "select count(t) from PaymentTransaction t"
                    + " where t.type = :type and t.payment.order.driver.id = :driverId")
    Page<PaymentTransaction> findByTypeAndDriverId(
            @Param("type") PaymentTransactionType type, @Param("driverId") Long driverId, Pageable pageable);
}

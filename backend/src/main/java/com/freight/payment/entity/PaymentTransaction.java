package com.freight.payment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "payment_transactions")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id", nullable = false)
    private Payment payment;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentTransactionType type;

    @Column(nullable = false)
    private long amount;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    private PaymentTransaction(
            Long id, Payment payment, PaymentTransactionType type, long amount, LocalDateTime createdAt) {
        this.id = id;
        this.payment = payment;
        this.type = type;
        this.amount = amount;
        this.createdAt = createdAt != null ? createdAt : LocalDateTime.now();
    }
}

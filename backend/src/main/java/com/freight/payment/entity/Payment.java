package com.freight.payment.entity;

import com.freight.global.common.BaseEntity;
import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.order.entity.Order;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 오더 하나의 에스크로 결제. 설계 문서 3장: HELD에서 RELEASED나 REFUNDED로만 바뀌고, 끝난 결제는 다시 바뀌지 않는다. */
@Getter
@Entity
@Table(name = "payments")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Payment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    private Order order;

    @Column(nullable = false)
    private long amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status;

    @Version
    private long version;

    @Builder
    private Payment(Long id, Order order, long amount, PaymentStatus status, long version) {
        this.id = id;
        this.order = order;
        this.amount = amount;
        this.status = status != null ? status : PaymentStatus.HELD;
        this.version = version;
    }

    /** 보관 중인 금액을 수정된 운임으로 바꾼다. */
    public void changeAmount(long newAmount) {
        requireHeld();
        this.amount = newAmount;
    }

    /** 보관 중인 운임을 차주에게 지급한 상태로 끝낸다. */
    public void release() {
        requireHeld();
        this.status = PaymentStatus.RELEASED;
    }

    /** 보관 중인 운임을 화주에게 환불한 상태로 끝낸다. */
    public void refund() {
        requireHeld();
        this.status = PaymentStatus.REFUNDED;
    }

    private void requireHeld() {
        if (this.status != PaymentStatus.HELD) {
            throw new BusinessException(ErrorCode.PAYMENT_ALREADY_SETTLED);
        }
    }
}

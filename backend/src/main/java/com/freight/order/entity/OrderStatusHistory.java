package com.freight.order.entity;

import com.freight.member.entity.Member;
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

/** 오더 상태 변경 이력. */
@Getter
@Entity
@Table(name = "order_status_history")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OrderStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Enumerated(EnumType.STRING)
    private OrderStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus toStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private Member actor;

    private String memo;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    private OrderStatusHistory(
            Long id,
            Order order,
            OrderStatus fromStatus,
            OrderStatus toStatus,
            Member actor,
            String memo,
            LocalDateTime createdAt) {
        this.id = id;
        this.order = order;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.actor = actor;
        this.memo = memo;
        this.createdAt = createdAt != null ? createdAt : LocalDateTime.now();
    }
}

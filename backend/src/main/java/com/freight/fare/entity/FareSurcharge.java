package com.freight.fare.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "fare_surcharge")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FareSurcharge {

    @Id
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SurchargeType type;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal rate;

    @Builder
    private FareSurcharge(SurchargeType type, BigDecimal rate) {
        this.type = type;
        this.rate = rate;
    }

    public void update(BigDecimal rate) {
        this.rate = rate;
    }
}

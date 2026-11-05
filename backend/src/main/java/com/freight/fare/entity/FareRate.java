package com.freight.fare.entity;

import com.freight.vehicle.entity.VehicleType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 차종별 기본요금과 km당 단가. */
@Getter
@Entity
@Table(name = "fare_rate")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FareRate {

    @Id
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VehicleType vehicleType;

    @Column(nullable = false)
    private long baseFare;

    @Column(nullable = false)
    private long perKmFare;

    @Builder
    private FareRate(VehicleType vehicleType, long baseFare, long perKmFare) {
        this.vehicleType = vehicleType;
        this.baseFare = baseFare;
        this.perKmFare = perKmFare;
    }

    /** 기본요금과 km당 단가를 수정한다. */
    public void update(long baseFare, long perKmFare) {
        this.baseFare = baseFare;
        this.perKmFare = perKmFare;
    }
}

package com.freight.vehicle.entity;

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
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 차주의 차량. 차주 한 명당 한 대만 등록한다. */
@Getter
@Entity
@Table(name = "vehicles")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id", nullable = false, unique = true)
    private Member driver;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VehicleType vehicleType;

    @Column(nullable = false)
    private String plateNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BodyType bodyType;

    @Builder
    private Vehicle(Long id, Member driver, VehicleType vehicleType, String plateNumber, BodyType bodyType) {
        this.id = id;
        this.driver = driver;
        this.vehicleType = vehicleType;
        this.plateNumber = plateNumber;
        this.bodyType = bodyType;
    }

    /** 차종, 차량번호, 적재함 형태를 수정한다. */
    public void update(VehicleType vehicleType, String plateNumber, BodyType bodyType) {
        this.vehicleType = vehicleType;
        this.plateNumber = plateNumber;
        this.bodyType = bodyType;
    }
}

package com.freight.order.entity;

import com.freight.global.common.BaseEntity;
import com.freight.member.entity.Member;
import com.freight.vehicle.entity.BodyType;
import com.freight.vehicle.entity.VehicleType;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.AttributeOverrides;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
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
import jakarta.persistence.Version;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "orders")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Order extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shipper_id", nullable = false)
    private Member shipper;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id")
    private Member driver;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "address", column = @Column(name = "pickup_address", nullable = false)),
        @AttributeOverride(name = "detailAddress", column = @Column(name = "pickup_detail_address")),
        @AttributeOverride(name = "region", column = @Column(name = "pickup_region", nullable = false)),
        @AttributeOverride(name = "latitude", column = @Column(name = "pickup_latitude", nullable = false)),
        @AttributeOverride(name = "longitude", column = @Column(name = "pickup_longitude", nullable = false)),
        @AttributeOverride(name = "contactName", column = @Column(name = "pickup_contact_name", nullable = false)),
        @AttributeOverride(name = "contactPhone", column = @Column(name = "pickup_contact_phone", nullable = false))
    })
    private Location pickup;

    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "address", column = @Column(name = "dropoff_address", nullable = false)),
        @AttributeOverride(name = "detailAddress", column = @Column(name = "dropoff_detail_address")),
        @AttributeOverride(name = "region", column = @Column(name = "dropoff_region", nullable = false)),
        @AttributeOverride(name = "latitude", column = @Column(name = "dropoff_latitude", nullable = false)),
        @AttributeOverride(name = "longitude", column = @Column(name = "dropoff_longitude", nullable = false)),
        @AttributeOverride(name = "contactName", column = @Column(name = "dropoff_contact_name", nullable = false)),
        @AttributeOverride(name = "contactPhone", column = @Column(name = "dropoff_contact_phone", nullable = false))
    })
    private Location dropoff;

    @Column(nullable = false)
    private LocalDateTime pickupAt;

    private LocalDateTime arriveBy;

    @Embedded
    private Cargo cargo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VehicleType requiredVehicleType;

    @Enumerated(EnumType.STRING)
    private BodyType bodyType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LoadingMethod loadingMethod;

    private String memo;

    @Column(nullable = false)
    private long fare;

    @Column(nullable = false)
    private long recommendedFare;

    @Column(nullable = false)
    private double distanceKm;

    private LocalDateTime assignedAt;

    private LocalDateTime droppedOffAt;

    private LocalDateTime completedAt;

    @Version
    private long version;

    @Builder
    private Order(
            Long id,
            Member shipper,
            Member driver,
            OrderStatus status,
            Location pickup,
            Location dropoff,
            LocalDateTime pickupAt,
            LocalDateTime arriveBy,
            Cargo cargo,
            VehicleType requiredVehicleType,
            BodyType bodyType,
            LoadingMethod loadingMethod,
            String memo,
            long fare,
            long recommendedFare,
            double distanceKm,
            LocalDateTime assignedAt,
            LocalDateTime droppedOffAt,
            LocalDateTime completedAt,
            long version) {
        this.id = id;
        this.shipper = shipper;
        this.driver = driver;
        this.status = status != null ? status : OrderStatus.REGISTERED;
        this.pickup = pickup;
        this.dropoff = dropoff;
        this.pickupAt = pickupAt;
        this.arriveBy = arriveBy;
        this.cargo = cargo;
        this.requiredVehicleType = requiredVehicleType;
        this.bodyType = bodyType;
        this.loadingMethod = loadingMethod;
        this.memo = memo;
        this.fare = fare;
        this.recommendedFare = recommendedFare;
        this.distanceKm = distanceKm;
        this.assignedAt = assignedAt;
        this.droppedOffAt = droppedOffAt;
        this.completedAt = completedAt;
        this.version = version;
    }
}

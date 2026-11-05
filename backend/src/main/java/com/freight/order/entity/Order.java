package com.freight.order.entity;

import com.freight.global.common.BaseEntity;
import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.member.entity.Member;
import com.freight.member.entity.Role;
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
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Objects;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 운송 요청 정보와 상태 변경 규칙을 보관한다. 상태 변경은 아래 업무 메서드로만 허용한다. */
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

    /** 화주가 등록한 운송 요청을 생성한다. */
    public static Order create(Member shipper, OrderSpec spec) {
        if (shipper == null || shipper.getRole() != Role.SHIPPER) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return Order.builder()
                .shipper(shipper)
                .status(OrderStatus.REGISTERED)
                .pickup(spec.pickup())
                .dropoff(spec.dropoff())
                .pickupAt(spec.pickupAt())
                .arriveBy(spec.arriveBy())
                .cargo(spec.cargo())
                .requiredVehicleType(spec.requiredVehicleType())
                .bodyType(spec.bodyType())
                .loadingMethod(spec.loadingMethod())
                .memo(spec.memo())
                .fare(spec.fare())
                .recommendedFare(spec.recommendedFare())
                .distanceKm(spec.distanceKm())
                .build();
    }

    /** 화주 본인의 배차 전 정보만 수정하고 차액 계산에 사용할 기존 운임을 반환한다. */
    public long updateDetails(Member shipper, OrderSpec spec) {
        requireRole(shipper, Role.SHIPPER);
        requireOwner(shipper);
        requireStatus(OrderStatus.REGISTERED);
        long oldFare = this.fare;
        this.pickup = spec.pickup();
        this.dropoff = spec.dropoff();
        this.pickupAt = spec.pickupAt();
        this.arriveBy = spec.arriveBy();
        this.cargo = spec.cargo();
        this.requiredVehicleType = spec.requiredVehicleType();
        this.bodyType = spec.bodyType();
        this.loadingMethod = spec.loadingMethod();
        this.memo = spec.memo();
        this.fare = spec.fare();
        this.recommendedFare = spec.recommendedFare();
        this.distanceKm = spec.distanceKm();
        return oldFare;
    }

    /** 차주가 배차 전 요청을 수락하고 배정 시각을 기록한다. */
    public StatusChange accept(Member driver, LocalDateTime now) {
        requireRole(driver, Role.DRIVER);
        requireStatus(OrderStatus.REGISTERED);
        this.driver = driver;
        this.assignedAt = now;
        return moveTo(OrderStatus.ASSIGNED);
    }

    /** 상차 제한 시간 이전에 배정된 차주를 해제하고 공개 요청으로 돌린다. */
    public StatusChange cancelAssignment(Member driver, LocalDateTime now, Duration cutoff) {
        requireRole(driver, Role.DRIVER);
        requireAssignedDriver(driver);
        requireStatus(OrderStatus.ASSIGNED);
        if (!now.isBefore(this.pickupAt.minus(cutoff))) {
            throw new BusinessException(ErrorCode.DRIVER_CANCEL_CUTOFF_PASSED);
        }
        this.driver = null;
        this.assignedAt = null;
        return moveTo(OrderStatus.REGISTERED);
    }

    /** 화주는 배차 전, 관리자는 등록·배차 완료 상태에서만 요청을 취소한다. */
    public StatusChange cancel(Member actor) {
        if (actor == null) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        if (actor.getRole() == Role.ADMIN) {
            requireStatus(OrderStatus.REGISTERED, OrderStatus.ASSIGNED);
            return moveTo(OrderStatus.CANCELLED);
        }
        requireRole(actor, Role.SHIPPER);
        requireOwner(actor);
        requireStatus(OrderStatus.REGISTERED);
        return moveTo(OrderStatus.CANCELLED);
    }

    /** 배정된 차주가 상차 완료 후 운송을 시작한다. */
    public StatusChange startTransit(Member driver) {
        requireRole(driver, Role.DRIVER);
        requireAssignedDriver(driver);
        requireStatus(OrderStatus.ASSIGNED);
        return moveTo(OrderStatus.IN_TRANSIT);
    }

    /** 배정된 차주가 하차 완료를 기록하고 화주 확인을 기다린다. */
    public StatusChange completeDropoff(Member driver, LocalDateTime now) {
        requireRole(driver, Role.DRIVER);
        requireAssignedDriver(driver);
        requireStatus(OrderStatus.IN_TRANSIT);
        this.droppedOffAt = now;
        return moveTo(OrderStatus.AWAITING_CONFIRM);
    }

    /** 요청한 화주가 수령을 확인해 운송을 완료한다. */
    public StatusChange confirmReceipt(Member shipper, LocalDateTime now) {
        requireRole(shipper, Role.SHIPPER);
        requireOwner(shipper);
        requireStatus(OrderStatus.AWAITING_CONFIRM);
        this.completedAt = now;
        return moveTo(OrderStatus.COMPLETED);
    }

    /** 하차 완료 후 설정한 시간이 지났을 때만 자동 완료한다. */
    public StatusChange autoConfirm(LocalDateTime now, Duration after) {
        requireStatus(OrderStatus.AWAITING_CONFIRM);
        if (this.droppedOffAt == null || now.isBefore(this.droppedOffAt.plus(after))) {
            throw new BusinessException(ErrorCode.INVALID_STATUS_TRANSITION);
        }
        this.completedAt = now;
        return moveTo(OrderStatus.COMPLETED);
    }

    /** 화주가 수령 확인 대신 문제를 신고하면 분쟁 상태로 보낸다. */
    public StatusChange reportIssue(Member shipper) {
        requireRole(shipper, Role.SHIPPER);
        requireOwner(shipper);
        requireStatus(OrderStatus.AWAITING_CONFIRM);
        return moveTo(OrderStatus.DISPUTED);
    }

    /** 관리자가 명시한 지급 또는 환불 결과에 따라 분쟁을 종료한다. */
    public StatusChange resolveDispute(Member admin, DisputeResolution resolution, LocalDateTime now) {
        requireRole(admin, Role.ADMIN);
        requireStatus(OrderStatus.DISPUTED);
        if (resolution == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        if (resolution == DisputeResolution.PAY_DRIVER) {
            this.completedAt = now;
            return moveTo(OrderStatus.COMPLETED);
        }
        return moveTo(OrderStatus.CANCELLED);
    }

    private void requireRole(Member actor, Role expectedRole) {
        if (actor == null || actor.getRole() != expectedRole) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
    }

    private void requireOwner(Member actor) {
        if (this.shipper == null || !sameMember(this.shipper, actor)) {
            throw new BusinessException(ErrorCode.NOT_ORDER_OWNER);
        }
    }

    private void requireAssignedDriver(Member actor) {
        if (this.driver == null || !sameMember(this.driver, actor)) {
            throw new BusinessException(ErrorCode.NOT_ORDER_OWNER);
        }
    }

    private boolean sameMember(Member a, Member b) {
        if (a == b) {
            return true;
        }
        if (a.getId() != null && b.getId() != null) {
            return Objects.equals(a.getId(), b.getId());
        }
        return Objects.equals(a.getEmail(), b.getEmail());
    }

    private void requireStatus(OrderStatus... allowed) {
        boolean matches = Arrays.asList(allowed).contains(this.status);
        if (!matches) {
            throw new BusinessException(ErrorCode.INVALID_STATUS_TRANSITION);
        }
    }

    private StatusChange moveTo(OrderStatus next) {
        OrderStatus prev = this.status;
        this.status = next;
        return new StatusChange(prev, next);
    }
}

package com.freight.support;

import com.freight.member.entity.Member;
import com.freight.member.entity.Role;
import com.freight.order.entity.Cargo;
import com.freight.order.entity.CargoType;
import com.freight.order.entity.LoadingMethod;
import com.freight.order.entity.Location;
import com.freight.order.entity.Order;
import com.freight.order.entity.OrderStatus;
import com.freight.order.entity.PackageUnit;
import com.freight.vehicle.entity.BodyType;
import com.freight.vehicle.entity.Vehicle;
import com.freight.vehicle.entity.VehicleType;
import java.time.LocalDateTime;

public final class Fixtures {
    private Fixtures() {}

    public static Member shipper() {
        return shipper("shipper@freight.test");
    }

    public static Member shipper(String email) {
        return Member.builder()
                .email(email)
                .password("$2a$10$hashedpassword")
                .name("화주")
                .phone("010-1111-2222")
                .role(Role.SHIPPER)
                .build();
    }

    public static Member driver() {
        return driver("driver@freight.test");
    }

    public static Member driver(String email) {
        return Member.builder()
                .email(email)
                .password("$2a$10$hashedpassword")
                .name("차주")
                .phone("010-3333-4444")
                .role(Role.DRIVER)
                .build();
    }

    public static Member admin() {
        return Member.builder()
                .email("admin@freight.test")
                .password("$2a$10$hashedpassword")
                .name("관리자")
                .phone("010-9999-0000")
                .role(Role.ADMIN)
                .build();
    }

    public static Vehicle vehicle(Member driver, VehicleType vehicleType) {
        return Vehicle.builder()
                .driver(driver)
                .vehicleType(vehicleType)
                .plateNumber("80아1234")
                .bodyType(BodyType.CARGO)
                .build();
    }

    public static Location pickupLocation() {
        return Location.builder()
                .address("서울특별시 강남구 테헤란로 123")
                .detailAddress("1층 물류창고")
                .region("서울 강남구")
                .latitude(37.5012)
                .longitude(127.0396)
                .contactName("김발송")
                .contactPhone("010-1234-5678")
                .build();
    }

    public static Location dropoffLocation() {
        return Location.builder()
                .address("부산광역시 해운대구 센텀중앙로 45")
                .detailAddress("지하 1층 하역장")
                .region("부산 해운대구")
                .latitude(35.1711)
                .longitude(129.1273)
                .contactName("박수령")
                .contactPhone("010-8765-4321")
                .build();
    }

    public static Cargo cargo(int weightKg) {
        return Cargo.builder()
                .itemName("전자부품 파렛트")
                .cargoType(CargoType.PALLET)
                .weightKg(weightKg)
                .quantity(2)
                .packageUnit(PackageUnit.PALLET)
                .widthCm(110)
                .depthCm(110)
                .heightCm(150)
                .fragile(true)
                .noStack(false)
                .build();
    }

    public static Order registeredOrder(Member shipper) {
        return registeredOrder(shipper, VehicleType.TON_2_5, 1200, LocalDateTime.of(2026, 12, 1, 10, 0));
    }

    public static Order registeredOrder(
            Member shipper, VehicleType requiredVehicleType, int weightKg, LocalDateTime pickupAt) {
        return Order.builder()
                .shipper(shipper)
                .status(OrderStatus.REGISTERED)
                .pickup(pickupLocation())
                .dropoff(dropoffLocation())
                .pickupAt(pickupAt)
                .arriveBy(pickupAt.plusHours(6))
                .cargo(cargo(weightKg))
                .requiredVehicleType(requiredVehicleType)
                .bodyType(BodyType.CARGO)
                .loadingMethod(LoadingMethod.FORKLIFT)
                .memo("파손 주의")
                .fare(350_000L)
                .recommendedFare(340_000L)
                .distanceKm(390.5)
                .build();
    }
}

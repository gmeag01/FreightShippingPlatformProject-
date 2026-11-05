package com.freight.order.entity;

import com.freight.vehicle.entity.BodyType;
import com.freight.vehicle.entity.VehicleType;
import java.time.LocalDateTime;

/** 오더 등록과 수정에 쓰는 운송 정보 묶음. */
public record OrderSpec(
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
        double distanceKm) {}
